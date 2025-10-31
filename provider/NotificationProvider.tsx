
import React, { useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotification';
import { useAuthStore } from '@/store/authStore';

interface NotificationProviderProps {
  children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { session } = useAuthStore();
  const notifications = useNotifications();

  useEffect(() => {
    if (session) {
      console.log('Initializing notifications for session:', session);
      notifications.updateNotificationSchedules();
    }
  }, [session]);

  return <>{children}</>;
}