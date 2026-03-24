import { useState, useEffect, useCallback } from 'react';

export interface NotificationPermissionState {
  permission: NotificationPermission;
  isSupported: boolean;
}

export const useNotifications = () => {
  const [permissionState, setPermissionState] = useState<NotificationPermissionState>({
    permission: 'default',
    isSupported: false,
  });

  useEffect(() => {
    const isSupported = 'Notification' in window;
    setPermissionState({
      permission: isSupported ? Notification.permission : 'denied',
      isSupported,
    });
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!permissionState.isSupported) {
      console.warn('Notifications not supported');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermissionState((prev) => ({ ...prev, permission }));
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [permissionState.isSupported]);

  const sendNotification = useCallback(
    (title: string, options?: NotificationOptions): Notification | null => {
      if (!permissionState.isSupported || permissionState.permission !== 'granted') {
        console.warn('Notifications not permitted');
        return null;
      }

      try {
        const notification = new Notification(title, {
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          ...options,
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        return notification;
      } catch (error) {
        console.error('Error sending notification:', error);
        return null;
      }
    },
    [permissionState]
  );

  const scheduleNotification = useCallback(
    (title: string, options: NotificationOptions, delayMs: number): ReturnType<typeof setTimeout> | null => {
      if (!permissionState.isSupported || permissionState.permission !== 'granted') {
        return null;
      }

      return setTimeout(() => {
        sendNotification(title, options);
      }, delayMs);
    },
    [sendNotification, permissionState]
  );

  return {
    ...permissionState,
    requestPermission,
    sendNotification,
    scheduleNotification,
  };
};

// Utility to calculate delay until next reminder time
export const calculateNextReminderDelay = (
  reminderTime: string, // HH:MM format
  daysOfWeek: number[] // 0 = Sunday, 6 = Saturday
): number | null => {
  const now = new Date();
  const [hours, minutes] = reminderTime.split(':').map(Number);

  // Find the next valid day
  for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + dayOffset);
    targetDate.setHours(hours, minutes, 0, 0);

    const dayOfWeek = targetDate.getDay();

    if (daysOfWeek.includes(dayOfWeek) && targetDate > now) {
      return targetDate.getTime() - now.getTime();
    }
  }

  return null;
};

// Format time for display
export const formatReminderTime = (time: string): string => {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

// Format days for display
export const formatDays = (days: number[]): string => {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  if (days.length === 7) return 'Every day';
  if (JSON.stringify(days.sort()) === JSON.stringify([1, 2, 3, 4, 5])) return 'Weekdays';
  if (JSON.stringify(days.sort()) === JSON.stringify([0, 6])) return 'Weekends';
  return days.map((d) => dayNames[d]).join(', ');
};
