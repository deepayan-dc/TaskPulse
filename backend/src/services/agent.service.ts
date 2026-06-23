import { anthropic } from '../lib/anthropic';
import { prisma } from '../lib/prisma';
import { createTask, updateTaskStatus } from './task.service';
import { parseTaskStatus } from '../utils/validators';

export type AgentUser = { id: string; name: string; role: string };
export type ChatTurn = { role: 'user' | 'assistant'; content: string };

const MODEL = 'claude-opus-4-8';
const MAX_TOOL_TURNS = 6;
const TASK_STATUSES = ['Pending', 'In Progress', 'Completed', 'Approved', 'Returned'];

// A user only ever sees/acts on tasks within their scope:
//  - EMPLOYEE: tasks assigned to them
//  - MANAGER:  tasks they created (their team's tasks)
const taskScope = (user: AgentUser) =>
  user.role === 'MANAGER' ? { createdById: user.id } : { assignedToId: user.id };

const COMMON_TOOLS = [
  {
    name: 'get_my_tasks',
    description: "List the current user's tasks. Optionally filter by status.",
    input_schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: `Optional status filter, one of: ${TASK_STATUSES.join(', ')}`,
        },
      },
      required: [],
    },
  },
  {
    name: 'get_task_details',
    description:
      'Get full details (description, status, due date, recent comments) of one task by its numeric id.',
    input_schema: {
      type: 'object',
      properties: { taskId: { type: 'integer' } },
      required: ['taskId'],
    },
  },
  {
    name: 'update_task_status',
    description: "Change a task's status. Confirm with the user before calling this.",
    input_schema: {
      type: 'object',
      properties: {
        taskId: { type: 'integer' },
        status: { type: 'string', enum: TASK_STATUSES },
      },
      required: ['taskId', 'status'],
    },
  },
  {
    name: 'add_comment',
    description: 'Add a comment to a task. Confirm with the user before calling this.',
    input_schema: {
      type: 'object',
      properties: {
        taskId: { type: 'integer' },
        text: { type: 'string' },
      },
      required: ['taskId', 'text'],
    },
  },
];

const MANAGER_TOOLS = [
  {
    name: 'list_employees',
    description: 'List employees (id, name, email) so you can pick who to assign a task to.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'create_task',
    description:
      'Create and assign a new task to an employee. Confirm with the user before calling this.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        assignedToId: { type: 'string', description: 'Employee id from list_employees' },
        dueDate: { type: 'string', description: 'Due date as YYYY-MM-DD' },
      },
      required: ['title', 'assignedToId'],
    },
  },
];

const toolsForUser = (user: AgentUser) =>
  user.role === 'MANAGER' ? [...COMMON_TOOLS, ...MANAGER_TOOLS] : COMMON_TOOLS;

const buildSystemPrompt = (user: AgentUser): string => {
  const scope =
    user.role === 'MANAGER'
      ? 'You can see and manage the tasks this manager created, list employees, and create/assign new tasks to employees.'
      : 'You can see and update the tasks assigned to this employee.';
  return [
    `You are the TaskPulse assistant, chatting with ${user.name} (role: ${user.role}) over WhatsApp.`,
    'You help them manage their tasks in the TaskPulse app.',
    scope,
    'Always use the tools to read or change real data — never invent tasks, ids, statuses, or due dates.',
    'When the user refers to a task by name or description, first look it up (get_my_tasks) to get its exact numeric id, then use that id. Do not guess ids.',
    'Before any action that changes data (updating a status, adding a comment, creating a task), confirm with the user first by restating the concrete change (the task title and what will happen). Resolve the task id before asking, so that once they agree (e.g. "yes") you can call the write tool immediately without asking again.',
    "Only act within this user's scope. If they ask about tasks that aren't theirs, tell them you can't access those.",
    'Keep replies short, friendly and WhatsApp-appropriate: plain text, short sentences, simple dashes for lists — no markdown tables or headings. Use the person\'s name occasionally.',
    'If a message is not about tasks, reply briefly and offer to help with their tasks.',
  ].join(' ');
};

/* eslint-disable @typescript-eslint/no-explicit-any */
const runTool = async (name: string, input: any, user: AgentUser): Promise<string> => {
  try {
    switch (name) {
      case 'get_my_tasks': {
        const where: any = { ...taskScope(user) };
        if (input?.status) where.status = String(input.status);
        const tasks = await prisma.task.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            assignedTo: { select: { name: true } },
            createdBy: { select: { name: true } },
          },
        });
        if (!tasks.length) return 'No tasks found for this user.';
        return JSON.stringify(
          tasks.map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            dueDate: t.dueDate,
            assignedTo: t.assignedTo?.name,
            createdBy: t.createdBy?.name,
          }))
        );
      }

      case 'get_task_details': {
        const id = Number(input?.taskId);
        if (!Number.isInteger(id)) return 'A valid numeric taskId is required.';
        const t = await prisma.task.findFirst({
          where: { id, ...taskScope(user) },
          include: {
            assignedTo: { select: { name: true, email: true } },
            createdBy: { select: { name: true } },
            comments: {
              include: { user: { select: { name: true } } },
              orderBy: { createdAt: 'desc' },
              take: 10,
            },
          },
        });
        if (!t) return 'Task not found, or you do not have access to it.';
        return JSON.stringify({
          id: t.id,
          title: t.title,
          description: t.description,
          status: t.status,
          dueDate: t.dueDate,
          assignedTo: t.assignedTo?.name,
          createdBy: t.createdBy?.name,
          comments: t.comments.map((c) => ({ by: c.user?.name, text: c.content })),
        });
      }

      case 'update_task_status': {
        const id = Number(input?.taskId);
        if (!Number.isInteger(id)) return 'A valid numeric taskId is required.';
        let status: string;
        try {
          status = parseTaskStatus(input?.status);
        } catch {
          return `Invalid status. Use one of: ${TASK_STATUSES.join(', ')}.`;
        }
        const t = await prisma.task.findFirst({ where: { id, ...taskScope(user) }, select: { id: true } });
        if (!t) return 'Task not found, or you do not have access to it.';
        await updateTaskStatus(id, status);
        return `Task ${id} status updated to "${status}".`;
      }

      case 'add_comment': {
        const id = Number(input?.taskId);
        if (!Number.isInteger(id)) return 'A valid numeric taskId is required.';
        const text = String(input?.text ?? '').trim();
        if (!text) return 'Comment text is required.';
        const t = await prisma.task.findFirst({ where: { id, ...taskScope(user) }, select: { id: true } });
        if (!t) return 'Task not found, or you do not have access to it.';
        await prisma.comment.create({ data: { content: text, taskId: id, userId: user.id } });
        return `Comment added to task ${id}.`;
      }

      case 'list_employees': {
        if (user.role !== 'MANAGER') return 'Only managers can list employees.';
        const employees = await prisma.user.findMany({
          where: { role: 'EMPLOYEE' },
          select: { id: true, name: true, email: true },
        });
        return JSON.stringify(employees);
      }

      case 'create_task': {
        if (user.role !== 'MANAGER') return 'Only managers can create tasks.';
        const title = String(input?.title ?? '').trim();
        const assignedToId = String(input?.assignedToId ?? '').trim();
        if (!title) return 'Task title is required.';
        if (!assignedToId) return 'assignedToId is required — use list_employees to find it.';
        let dueDate: Date | undefined;
        if (input?.dueDate) {
          const parsed = new Date(String(input.dueDate));
          if (!Number.isNaN(parsed.getTime())) dueDate = parsed;
        }
        const task = await createTask({
          title,
          description: input?.description ? String(input.description) : undefined,
          assignedToId,
          createdById: user.id,
          dueDate,
        });
        return `Task created (id ${task.id}): "${title}".`;
      }

      default:
        return `Unknown tool: ${name}`;
    }
  } catch (error: any) {
    return `Error running ${name}: ${error?.message ?? 'unknown error'}`;
  }
};

/**
 * Run one conversational turn through Claude with tool access. Returns the
 * assistant's plain-text reply. Never throws.
 */
export const runAgent = async (
  user: AgentUser,
  history: ChatTurn[],
  userText: string
): Promise<string> => {
  if (!anthropic) {
    return 'The assistant is temporarily unavailable. Please try again later.';
  }

  const tools = toolsForUser(user);
  const system = buildSystemPrompt(user);
  const messages: any[] = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: userText },
  ];

  try {
    for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system,
        tools: tools as any,
        messages,
      } as any);

      if (response.stop_reason === 'tool_use') {
        messages.push({ role: 'assistant', content: response.content });
        const toolResults: any[] = [];
        for (const block of response.content as any[]) {
          if (block.type === 'tool_use') {
            const result = await runTool(block.name, block.input, user);
            toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
          }
        }
        messages.push({ role: 'user', content: toolResults });
        continue;
      }

      const text = (response.content as any[])
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim();
      return text || 'Okay.';
    }

    return "Sorry, that took too many steps — could you rephrase what you'd like to do?";
  } catch (error) {
    console.error('Agent error:', error);
    return 'Sorry, I hit a problem handling that. Please try again in a moment.';
  }
};
/* eslint-enable @typescript-eslint/no-explicit-any */
