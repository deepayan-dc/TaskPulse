import { anthropic } from '../lib/anthropic';
import { prisma } from '../lib/prisma';
import { createTask, updateTaskStatus } from './task.service';
import { onboardEmployees, deleteEmployee } from './onboarding.service';
import { recordAiUsage } from './usage.service';
import { parseTaskStatus } from '../utils/validators';

export type AgentUser = { id: string; name: string; role: string; organizationId?: string | null };
export type ChatTurn = { role: 'user' | 'assistant'; content: string };

const MODEL = 'claude-opus-4-8';
const MAX_TOOL_TURNS = 6;
const TASK_STATUSES = ['Pending', 'In Progress', 'Completed', 'Approved', 'Returned'];

// A user only ever sees/acts on tasks within their scope:
//  - EMPLOYEE: tasks assigned to them
//  - MANAGER:  tasks they created (their team's tasks)
const taskScope = (user: AgentUser) =>
  user.role === 'ADMIN' ? { createdById: user.id } : { assignedToId: user.id };

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
    description:
      'List your team members (id, name, email) — use this to pick who to assign a task to, or who to remove.',
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
  {
    name: 'onboard_employees',
    description:
      'Register one or more new employees under you. Each gets a temporary password to share with them. Confirm the list (names/emails/numbers) with the user before calling this.',
    input_schema: {
      type: 'object',
      properties: {
        employees: {
          type: 'array',
          description: 'The employees to onboard.',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              email: { type: 'string' },
              phone: { type: 'string', description: 'WhatsApp number' },
              designation: { type: 'string', description: 'Job title, e.g. Developer, Intern' },
            },
            required: ['name', 'email', 'phone'],
          },
        },
      },
      required: ['employees'],
    },
  },
  {
    name: 'remove_employee',
    description:
      'Fire/remove an employee from your team. This reassigns their tasks to you and deletes their account. This is destructive — always confirm with the user before calling this.',
    input_schema: {
      type: 'object',
      properties: {
        employeeId: { type: 'string', description: 'Employee id from list_employees' },
      },
      required: ['employeeId'],
    },
  },
];

const toolsForUser = (user: AgentUser) =>
  user.role === 'ADMIN' ? [...COMMON_TOOLS, ...MANAGER_TOOLS] : COMMON_TOOLS;

const buildSystemPrompt = (user: AgentUser): string => {
  const scope =
    user.role === 'ADMIN'
      ? 'You can manage the tasks this manager created, list their team, onboard new employees, remove (fire) employees, and create/assign tasks to their team members.'
      : 'You can see and update the tasks assigned to this employee.';
  return [
    `You are the TaskPulse assistant, chatting with ${user.name} (role: ${user.role}) over WhatsApp.`,
    'You help them manage their tasks and team in the TaskPulse app.',
    scope,
    'Always use the tools to read or change real data — never invent tasks, employees, ids, statuses, or due dates.',
    'When the user refers to a task or employee by name, first look it up (get_my_tasks or list_employees) to get its exact id, then use that id. Do not guess ids.',
    'Before any action that changes data (updating a status, adding a comment, creating a task, onboarding employees, or removing an employee), confirm with the user first by restating the concrete change. Resolve any needed id before asking, so that once they agree (e.g. "yes") you can call the tool immediately without asking again.',
    'Removing/firing an employee is destructive (it deletes their account and reassigns their tasks to you) — always confirm clearly before doing it.',
    'When you onboard employees, report back the temporary password generated for each one so the manager can share it.',
    "Only act within this user's scope. If they ask about tasks or employees that aren't theirs, tell them you can't access those.",
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
        if (user.role !== 'ADMIN') return 'Only admins can list employees.';
        // Scoped to this admin's own team (their onboarded members).
        const employees = await prisma.user.findMany({
          where: { managerId: user.id },
          select: { id: true, name: true, email: true, designation: true },
        });
        if (!employees.length) {
          return 'You have no team members yet. Onboard your team via the TaskPulse app (Onboard Team) first.';
        }
        return JSON.stringify(employees);
      }

      case 'create_task': {
        if (user.role !== 'ADMIN') return 'Only admins can create tasks.';
        const title = String(input?.title ?? '').trim();
        const assignedToId = String(input?.assignedToId ?? '').trim();
        if (!title) return 'Task title is required.';
        if (!assignedToId) return 'assignedToId is required — use list_employees to find it.';
        // Enforce tenancy: managers can only assign to their own employees.
        const employee = await prisma.user.findFirst({
          where: { id: assignedToId, managerId: user.id },
          select: { id: true },
        });
        if (!employee) return 'That employee is not on your team, so you cannot assign tasks to them.';
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

      case 'onboard_employees': {
        if (user.role !== 'ADMIN') return 'Only admins can onboard employees.';
        const employees = Array.isArray(input?.employees) ? input.employees : [];
        if (!employees.length) {
          return 'Provide at least one employee with a name, email and WhatsApp number.';
        }
        const rows = employees.map((e: any) => ({
          name: e?.name ? String(e.name) : undefined,
          email: e?.email ? String(e.email) : undefined,
          phone: e?.phone ? String(e.phone) : undefined,
          designation: e?.designation ? String(e.designation) : undefined,
        }));
        const result = await onboardEmployees(user.id, rows);
        const parts: string[] = [`Summary: ${JSON.stringify(result.summary)}`];
        if (result.created.length) {
          parts.push(
            'Onboarded (share these temporary passwords):\n' +
              result.created
                .map((c) => `- ${c.name} (${c.email}, ${c.phone}) — password: ${c.tempPassword}`)
                .join('\n')
          );
        }
        if (result.skipped.length) {
          parts.push(
            'Skipped:\n' +
              result.skipped.map((s) => `- ${s.email ?? 'row ' + s.row}: ${s.reason}`).join('\n')
          );
        }
        if (result.errors.length) {
          parts.push(
            'Errors:\n' + result.errors.map((er) => `- row ${er.row}: ${er.reason}`).join('\n')
          );
        }
        return parts.join('\n\n');
      }

      case 'remove_employee': {
        if (user.role !== 'ADMIN') return 'Only admins can remove employees.';
        const employeeId = String(input?.employeeId ?? '').trim();
        if (!employeeId) return 'employeeId is required — use list_employees to find it.';
        const removed = await deleteEmployee(user.id, employeeId);
        return `Removed ${removed.name} (${removed.email}) from your team. Their tasks were reassigned to you.`;
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

  let inputTokens = 0;
  let outputTokens = 0;

  try {
    for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system,
        tools: tools as any,
        messages,
      } as any);

      const usage = (response as any).usage ?? {};
      inputTokens +=
        (usage.input_tokens ?? 0) +
        (usage.cache_read_input_tokens ?? 0) +
        (usage.cache_creation_input_tokens ?? 0);
      outputTokens += usage.output_tokens ?? 0;

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
  } finally {
    void recordAiUsage(user.organizationId, inputTokens, outputTokens);
  }
};
/* eslint-enable @typescript-eslint/no-explicit-any */
