import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppNotification } from '../types/notification';
import { notificationService } from '../services/notificationService';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  addNotification: (targetUserId: string, message: string, taskId: string) => void;
  refreshNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const refreshNotifications = () => {
    if (user) {
      setNotifications(notificationService.getNotificationsForUser(user.id));
    } else {
      setNotifications([]);
    }
  };

  // Poll for notifications every 2 seconds to simulate real-time updates across "sessions"
  useEffect(() => {
    refreshNotifications();
    const interval = setInterval(refreshNotifications, 2000);
    return () => clearInterval(interval);
  }, [user]);

  const markAsRead = (id: string) => {
    notificationService.markAsRead(id);
    refreshNotifications();
  };

  const addNotification = (targetUserId: string, message: string, taskId: string) => {
    notificationService.createNotification(targetUserId, message, taskId);
    refreshNotifications(); // In case we are sending a notification to ourselves
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      markAsRead,
      addNotification,
      refreshNotifications
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
