import { AppNotification } from '../types/notification';
import { apiFetch } from './api';

export const notificationService = {
  async getNotificationsForUser(userId: string): Promise<AppNotification[]> {
    try {
      const response = await apiFetch(`/notifications?userId=${userId}`);
      const data = await response.json();
      return data.data.map((n: any) => ({
        id: String(n.id),
        message: n.message,
        createdAt: n.createdAt,
        read: n.isRead,
        taskId: String(n.taskId),
        targetUserId: String(n.userId)
      }));
    } catch (e) {
      console.error('Failed to fetch notifications', e);
      return [];
    }
  },

  // Fallback to local behavior since there is no POST/PATCH notification endpoint
  createNotification(
    targetUserId: string,
    message: string,
    taskId: string
  ): AppNotification {
    return {
      id: `n-${Math.random().toString(36).substring(2, 9)}`,
      message,
      createdAt: new Date().toISOString(),
      read: false,
      taskId,
      targetUserId,
    };
  },

  markAsRead(_notificationId: string): AppNotification | null {
    // API doesn't support markAsRead yet, mock return
    return null;
  }
};
