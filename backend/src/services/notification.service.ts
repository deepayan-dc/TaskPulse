import { prisma } from '../lib/prisma';

export const getNotifications = async (userId?: string) => {
  return prisma.notification.findMany({
    where: userId ? { userId } : undefined,
    orderBy: { createdAt: 'desc' },
    include: {
      task: {
        select: {
          id: true,
          title: true,
          status: true,
        },
      },
    },
  });
};
