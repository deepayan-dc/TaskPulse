import { prisma } from '../lib/prisma';
import { AppError } from '../utils/app-error';

export const getCommentsByTaskId = async (taskId: number) => {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    throw new AppError('Task not found', 404);
  }

  return prisma.comment.findMany({
    where: { taskId },
    orderBy: { createdAt: 'asc' },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });
};

export const createComment = async (input: {
  content: string;
  taskId: number;
  userId: string;
}) => {
  const [task, user] = await Promise.all([
    prisma.task.findUnique({ where: { id: input.taskId } }),
    prisma.user.findUnique({ where: { id: input.userId } }),
  ]);

  if (!task) {
    throw new AppError('Task not found', 404);
  }

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return prisma.comment.create({
    data: {
      content: input.content,
      taskId: input.taskId,
      userId: input.userId,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      task: { select: { id: true, title: true } },
    },
  });
};
