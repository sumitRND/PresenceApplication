import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { notificationService } from '../services/notificationService';
import { useAttendanceStore } from '../store/attendanceStore';
import { useAuthStore } from '../store/authStore';

export function useNotifications() {
  const { session, userName } = useAuthStore();
  const { 
    todayAttendanceMarked, 
    attendanceRecords,
    fetchTodayAttendanceFromServer 
  } = useAttendanceStore();
  
  const appState = useRef(AppState.currentState);
  const notificationUpdateInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasShownLoginNotification = useRef(false);

  const getTodayRecord = () => {
    const today = new Date().toISOString().split('T')[0];
    return attendanceRecords.find(record => record.date === today);
  };

  useEffect(() => {
    if (session && userName) {
      console.log('Setting up notifications for user:', userName);
      setupNotifications();
      
      if (!hasShownLoginNotification.current) {
        notificationService.showLoginSessionNotification();
        hasShownLoginNotification.current = true;
      }
      
      notificationUpdateInterval.current = setInterval(() => {
        updateNotificationSchedules();
      }, 30 * 60 * 1000);

      return () => {
        if (notificationUpdateInterval.current) {
          clearInterval(notificationUpdateInterval.current);
        }
      };
    } else {
      notificationService.cancelAllNotifications();
      hasShownLoginNotification.current = false;
    }
  }, [session, userName]);

  useEffect(() => {
    if (session) {
      updateNotificationSchedules();
    }
  }, [todayAttendanceMarked, attendanceRecords]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      console.log('App came to foreground, checking attendance status');
      
      if (session) {
        await fetchTodayAttendanceFromServer();
        updateNotificationSchedules();
      }
    }
    appState.current = nextAppState;
  };

  const setupNotifications = async () => {
    try {
      await notificationService.registerForPushNotifications();
      await updateNotificationSchedules();
    } catch (error) {
      console.error('Error setting up notifications:', error);
    }
  };

  const updateNotificationSchedules = async () => {
    const todayRecord = getTodayRecord();
    const hasMarkedAttendance = !!todayRecord;
    const hasCheckedOut = todayRecord?.isCheckedOut || false;
    const checkInTime = todayRecord?.checkInTime;
    
    console.log('Updating notification schedules:', {
      hasMarkedAttendance,
      hasCheckedOut,
      checkInTime,
    });

    await notificationService.updateNotificationsForAttendanceStatus(
      hasMarkedAttendance,
      hasCheckedOut,
      checkInTime
    );
  };

  const scheduleAttendanceReminders = async () => {
    const todayRecord = getTodayRecord();
    await notificationService.scheduleAttendanceReminders(!todayRecord);
  };

  const scheduleCheckoutReminder = async () => {
    const todayRecord = getTodayRecord();
    if (todayRecord && !todayRecord.isCheckedOut) {
      await notificationService.scheduleCheckoutReminder(false, todayRecord.checkInTime);
    }
  };

  const cancelAllNotifications = async () => {
    await notificationService.cancelAllNotifications();
  };

  const sendTestNotification = async () => {
    await notificationService.sendTestNotification();
  };

  return {
    scheduleAttendanceReminders,
    scheduleCheckoutReminder,
    cancelAllNotifications,
    sendTestNotification,
    updateNotificationSchedules,
  };
}