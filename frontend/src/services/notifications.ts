import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATION_IDS_KEY = '@dos/notification_ids';

// Configure how notifications appear when app is foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── Permission Handling ───

export async function getNotificationPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

export async function requestNotificationPermission(): Promise<boolean> {
  // On web or non-device environments, permissions work differently
  if (!Device.isDevice) {
    console.log('[Notifications] Not a physical device, skipping permission request');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  
  if (existingStatus === 'granted') {
    return true;
  }

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// ─── Notification ID Storage ───
// We store a mapping of reminder_id -> notification_identifier so we can cancel them

async function getStoredNotificationIds(): Promise<Record<string, string>> {
  const raw = await AsyncStorage.getItem(NOTIFICATION_IDS_KEY);
  return raw ? JSON.parse(raw) : {};
}

async function setStoredNotificationIds(ids: Record<string, string>) {
  await AsyncStorage.setItem(NOTIFICATION_IDS_KEY, JSON.stringify(ids));
}

// ─── Schedule Notification for Reminder ───

export async function scheduleReminderNotification(reminder: {
  id: string;
  title: string;
  note?: string;
  interval_type: string;
  interval_value: number;
  specific_time?: string;
  is_active: boolean;
}): Promise<string | null> {
  // Don't schedule if inactive
  if (!reminder.is_active) {
    return null;
  }

  // Cancel any existing notification for this reminder first
  await cancelReminderNotification(reminder.id);

  // Check permission (don't request here, just check)
  const status = await getNotificationPermissionStatus();
  if (status !== 'granted') {
    console.log('[Notifications] Permission not granted, skipping schedule');
    return null;
  }

  let trigger: Notifications.NotificationTriggerInput;

  if (reminder.interval_type === 'specific' && reminder.specific_time) {
    // Daily at specific time
    const [hour, minute] = reminder.specific_time.split(':').map(Number);
    trigger = {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    };
  } else if (reminder.interval_type === 'minutes') {
    // Repeat every X minutes (minimum 1 minute for Expo)
    const seconds = Math.max(reminder.interval_value, 1) * 60;
    trigger = {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      repeats: true,
    };
  } else if (reminder.interval_type === 'hours') {
    // Repeat every X hours
    const seconds = reminder.interval_value * 60 * 60;
    trigger = {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      repeats: true,
    };
  } else {
    console.log('[Notifications] Unknown interval type:', reminder.interval_type);
    return null;
  }

  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: reminder.title,
        body: reminder.note || 'Time for your reminder!',
        sound: true,
        data: { reminderId: reminder.id },
      },
      trigger,
    });

    // Store the mapping
    const ids = await getStoredNotificationIds();
    ids[reminder.id] = notificationId;
    await setStoredNotificationIds(ids);

    console.log(`[Notifications] Scheduled notification ${notificationId} for reminder ${reminder.id}`);
    return notificationId;
  } catch (error) {
    console.error('[Notifications] Failed to schedule:', error);
    return null;
  }
}

// ─── Cancel Notification for Reminder ───

export async function cancelReminderNotification(reminderId: string): Promise<void> {
  const ids = await getStoredNotificationIds();
  const notificationId = ids[reminderId];

  if (notificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log(`[Notifications] Cancelled notification ${notificationId} for reminder ${reminderId}`);
    } catch (error) {
      console.error('[Notifications] Failed to cancel:', error);
    }

    // Remove from storage
    delete ids[reminderId];
    await setStoredNotificationIds(ids);
  }
}

// ─── Cancel All Notifications ───

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await setStoredNotificationIds({});
  console.log('[Notifications] Cancelled all notifications');
}

// ─── Sync All Reminders ───
// Call this on app start to ensure notifications match current reminder state

export async function syncAllReminderNotifications(reminders: Array<{
  id: string;
  title: string;
  note?: string;
  interval_type: string;
  interval_value: number;
  specific_time?: string;
  is_active: boolean;
}>): Promise<void> {
  const status = await getNotificationPermissionStatus();
  if (status !== 'granted') {
    console.log('[Notifications] Permission not granted, skipping sync');
    return;
  }

  // Cancel all existing
  await cancelAllNotifications();

  // Re-schedule active ones
  for (const reminder of reminders) {
    if (reminder.is_active) {
      await scheduleReminderNotification(reminder);
    }
  }

  console.log(`[Notifications] Synced ${reminders.filter(r => r.is_active).length} active reminders`);
}

// ─── Get Scheduled Notifications (for debugging) ───

export async function getScheduledNotifications() {
  return Notifications.getAllScheduledNotificationsAsync();
}
