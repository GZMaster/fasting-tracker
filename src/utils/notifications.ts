import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { PhaseInfo } from '../types';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Notification permissions not granted');
      return false;
    }

    // Configure notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('fasting-reminders', {
        name: 'Fasting Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6366f1',
      });
    }

    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
}

/**
 * Schedule a notification
 */
export async function scheduleNotification(
  identifier: string,
  title: string,
  body: string,
  trigger: Date | number
): Promise<string | null> {
  try {
    const triggerInput: Notifications.NotificationTriggerInput =
      trigger instanceof Date
        ? { type: Notifications.SchedulableTriggerInputTypes.DATE, date: trigger }
        : { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: trigger };

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: triggerInput,
      identifier,
    });

    return notificationId;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
}

/**
 * Cancel a notification by identifier
 */
export async function cancelNotification(identifier: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch (error) {
    console.error('Error canceling notification:', error);
  }
}

/**
 * Cancel all notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error canceling all notifications:', error);
  }
}

/**
 * Schedule notifications for phase transitions
 */
export async function schedulePhaseNotifications(phaseInfo: PhaseInfo): Promise<void> {
  // Cancel existing notifications first
  await cancelAllNotifications();

  const now = new Date();
  const phaseEnd = new Date(phaseInfo.endTime);

  // Schedule notification for phase end (5 minutes before)
  const reminderTime = new Date(phaseEnd.getTime() - 5 * 60 * 1000);

  if (reminderTime > now) {
    let title = '';
    let body = '';

    switch (phaseInfo.phase) {
      case 'fast_1':
      case 'fast_2':
        title = 'Fast Ending Soon';
        body = 'Your fast will end in 5 minutes. Get ready for your eating window!';
        break;
      case 'eating_window_1':
      case 'daily_eating_window':
      case 'recovery_eating_window':
        title = 'Eating Window Ending Soon';
        body = 'Your eating window will close in 5 minutes.';
        break;
    }

    if (title && body) {
      await scheduleNotification(
        `phase-end-${phaseInfo.phase}`,
        title,
        body,
        reminderTime
      );
    }
  }

  // Schedule notification for phase start (at phase end time)
  if (phaseEnd > now) {
    let title = '';
    let body = '';

    switch (phaseInfo.phase) {
      case 'fast_1':
        title = 'Eating Window Started';
        body = 'Your first eating window is now open!';
        break;
      case 'eating_window_1':
        title = 'Fast 2 Started';
        body = 'Your second 36-hour fast has begun. Stay strong!';
        break;
      case 'fast_2':
        title = 'Daily Eating Windows';
        body = 'You can now eat during your daily 12-hour windows.';
        break;
    }

    if (title && body) {
      await scheduleNotification(
        `phase-start-${phaseInfo.phase}`,
        title,
        body,
        phaseEnd
      );
    }
  }
}

/**
 * Get all scheduled notifications
 */
export async function getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    return [];
  }
}

