import { AppNotification } from '../types/notification';

const STORAGE_KEY = 'taskpulse_notifications';

const getStoredNotifications = (): AppNotification[] => {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
};

const saveNotifications = (notifications: AppNotification[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
};

export const notificationService = {
  getNotificationsForUser(userId: string): AppNotification[] {
    return getStoredNotifications()
      .filter(n => n.targetUserId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  createNotification(
    targetUserId: string,
    message: string,
    taskId: string
  ): AppNotification {
    const notifications = getStoredNotifications();
    const newNotification: AppNotification = {
      id: `n-${Math.random().toString(36).substring(2, 9)}`,
      message,
      createdAt: new Date().toISOString(),
      read: false,
      taskId,
      targetUserId,
    };
    
    saveNotifications([newNotification, ...notifications]);
    return newNotification;
  },

  markAsRead(notificationId: string): AppNotification | null {
    const notifications = getStoredNotifications();
    const index = notifications.findIndex(n => n.id === notificationId);
    if (index === -1) return null;
    
    notifications[index].read = true;
    saveNotifications(notifications);
    return notifications[index];
  }
};
