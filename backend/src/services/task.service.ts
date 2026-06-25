import { prisma } from '../lib/prisma';
import { AppError } from '../utils/app-error';
import { config } from '../config';
import {
  sendTaskPulseNotification,
  sendWhatsAppText,
  sendTaskUpdateNotification,
} from './whatsapp.service';

// A user may only see/act on tasks they created (manager) or are assigned (employee).
export const taskScopeWhere = (userId: string) => ({
  OR: [{ createdById: userId }, { assignedToId: userId }],
});

export const assertTaskAccess = async (taskId: number, userId: string) => {
  const task = await prisma.task.findFirst({
    where: { id: taskId, ...taskScopeWhere(userId) },
    select: { id: true },
  });
  if (!task) {
    throw new AppError('Task not found, or you do not have access to it', 404);
  }
};

export const getTasks = async (userId: string) => {
  return prisma.task.findMany({
    where: taskScopeWhere(userId),
    orderBy: { createdAt: 'desc' },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      timeLogs: true,
      _count: {
        select: {
          comments: true,
          notifications: true,
        },
      },
    },
  });
};

export const createTask = async (input: {
  title: string;
  description?: string;
  assignedToId: string;
  createdById: string;
  dueDate?: Date;
}) => {
  const [assignedTo, createdBy] = await Promise.all([
    prisma.user.findUnique({ where: { id: input.assignedToId } }),
    prisma.user.findUnique({ where: { id: input.createdById } }),
  ]);

  if (!assignedTo) {
    throw new AppError('assignedToId user not found', 404);
  }

  if (!createdBy) {
    throw new AppError('createdById user not found', 404);
  }

  const task = await prisma.task.create({
    data: {
      title: input.title,
      description: input.description,
      assignedToId: input.assignedToId,
      createdById: input.createdById,
      dueDate: input.dueDate,
      status: 'Pending',
      notifications: {
        create: {
          userId: input.assignedToId,
          message: `You have been assigned task: ${input.title}`,
        },
      },
    },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      timeLogs: true,
    },
  });

  if (assignedTo.phone) {
    await sendTaskPulseNotification({
      recipientPhone: assignedTo.phone,
      fallbackName: assignedTo.name,
      taskId: task.id,
      organizationId: assignedTo.organizationId,
    });
  } else {
    console.warn(`Skipping WhatsApp assignment alert. No phone number for user ${assignedTo.id}.`);
  }

  return task;
};

/**
 * Notify the task's assignee that an existing task was changed via the WhatsApp
 * agent — both a WhatsApp template and an in-app TaskPulse notification.
 *
 * `changeType` fills {{2}} ("status" or "comment"); `detail` fills {{4}} — the
 * comment text for a comment, or the new status for a status change.
 * Skips the person who made the change (no point notifying yourself). Never throws.
 */
export const notifyAssigneeOfTaskUpdate = async (opts: {
  taskId: number;
  changeType: string;
  detail: string;
  actingUserId: string;
}): Promise<void> => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: opts.taskId },
      include: {
        assignedTo: { select: { id: true, name: true, phone: true, organizationId: true } },
      },
    });
    const assignee = task?.assignedTo;
    if (!task || !assignee) return;
    if (assignee.id === opts.actingUserId) return; // don't notify the actor about their own change

    // In-app TaskPulse notification.
    await prisma.notification.create({
      data: {
        taskId: task.id,
        userId: assignee.id,
        message: `Task "${task.title}" ${opts.changeType} updated: ${opts.detail}`,
      },
    });

    // WhatsApp template to the assignee.
    if (assignee.phone) {
      await sendTaskUpdateNotification({
        recipientPhone: assignee.phone,
        assigneeName: assignee.name,
        changeType: opts.changeType,
        taskName: task.title,
        detail: opts.detail,
        organizationId: assignee.organizationId,
      });
    } else {
      console.warn(`No phone for assignee ${assignee.id}; WhatsApp task-update alert skipped.`);
    }
  } catch (error) {
    console.error(`Failed to notify assignee of task ${opts.taskId} update:`, error);
  }
};

export const updateTaskStatus = async (taskId: number, status: string) => {
  const existingTask = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          phone: true,
          organizationId: true,
        },
      },
    },
  });
  if (!existingTask) {
    throw new AppError('Task not found', 404);
  }

  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: {
      status,
      notifications: {
        create: {
          userId: existingTask.createdById,
          message: `Task "${existingTask.title}" status changed to ${status}`,
        },
      },
    },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      timeLogs: true,
    },
  });

  if (status === 'Completed' || status === 'DONE') {
    if (existingTask.createdBy.phone) {
      // Free-form text (not the "Task assigned" template) — only delivered if the
      // manager has an open 24h WhatsApp session with the business number.
      const text =
        `Hi ${existingTask.createdBy.name}, task #${existingTask.id} ` +
        `"${existingTask.title}" has been marked ${status}.\n` +
        `${config.frontendUrl}/tasks/${existingTask.id}`;
      await sendWhatsAppText(
        existingTask.createdBy.phone,
        text,
        existingTask.createdBy.organizationId
      );
    } else {
      console.warn(
        `Skipping WhatsApp completion alert. No phone number for manager ${existingTask.createdBy.id}.`
      );
    }
  }

  return updatedTask;
};
