
import { useNotifications } from '@/hooks/useNotification';
import { useAuthStore } from '@/store/authStore';
import React, { useEffect } from 'react';

interface NotificationProviderProps {
  children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { isAuthenticated } = useAuthStore();
  const notifications = useNotifications();

  useEffect(() => {
    if (isAuthenticated) {
      console.log('Initializing notifications for session:', isAuthenticated);
      notifications.updateNotificationSchedules();
    }
  }, [isAuthenticated]);

  return <>{children}</>;
}
