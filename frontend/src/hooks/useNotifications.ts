import { useState, useEffect } from 'react';
import { Notification } from '@/types';
import { socketService } from '@/services/socketService';
import { notificationApi } from '@/services/mockApi';
import { useNotificationStore } from '@/stores/notificationStore';

export function useNotifications(userId?: string) {
  const { notifications, unreadCount, setNotifications, addNotification, markAsRead, markAllRead } =
    useNotificationStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;

    // Load from real API
    setLoading(true);
    notificationApi.getForUser(userId)
      .then(data => setNotifications(data))
      .catch(console.error)
      .finally(() => setLoading(false));

    // Subscribe to real-time notifications via WebSocket
    const token = localStorage.getItem('auth-token');
    if (token && !socketService.isConnected()) {
      socketService.connect(token).catch(console.error);
    }

    const unsubscribe = socketService.subscribe(
      `user.${userId}.notifications`,
      (event) => addNotification(event.payload as Notification)
    );

    return () => unsubscribe();
  }, [userId]);

  const handleMarkAsRead = async (id: string) => {
    await notificationApi.markAsRead(id);
    markAsRead(id);
  };

  const handleMarkAllRead = async () => {
    if (!userId) return;
    await notificationApi.markAllRead(userId);
    markAllRead();
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead: handleMarkAsRead,
    markAllRead: handleMarkAllRead,
  };
}
