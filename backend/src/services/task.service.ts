import { prisma } from '../lib/prisma';
import { AppError } from '../utils/app-error';
import { sendTaskPulseNotification } from './whatsapp.service';

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

export const updateTaskStatus = async (taskId: number, status: string) => {
  const existingTask = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      createdBy: {
        select: {
          id: true,
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
      await sendTaskPulseNotification({
        recipientPhone: existingTask.createdBy.phone,
        taskId: existingTask.id,
        organizationId: existingTask.createdBy.organizationId,
      });
    } else {
      console.warn(
        `Skipping WhatsApp completion alert. No phone number for manager ${existingTask.createdBy.id}.`
      );
    }
  }

  return updatedTask;
};
