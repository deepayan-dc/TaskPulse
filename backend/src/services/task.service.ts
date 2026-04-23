import { prisma } from '../lib/prisma';
import { AppError } from '../utils/app-error';

export const getTasks = async () => {
  return prisma.task.findMany({
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

  return task;
};

export const updateTaskStatus = async (taskId: number, status: string) => {
  const existingTask = await prisma.task.findUnique({ where: { id: taskId } });
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

  return updatedTask;
};
