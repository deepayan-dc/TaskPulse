export interface AppNotification {
  id: string;
  message: string;
  createdAt: string;
  read: boolean;
  taskId: string;
  targetUserId: string; // The user who should receive this notification
}
