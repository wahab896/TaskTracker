import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch {}

const CHANNEL_ID = 'timers';

/** Android silently drops scheduled notifications without a channel on
 *  some OS versions — this must run before anything is scheduled. */
export async function ensureNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Timers',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 300, 150, 300],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  } catch (error) {
    console.warn('[notifications] Failed to create Android notification channel:', error);
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    await ensureNotificationChannel();
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') return true;
    const { status: newStatus } = await Notifications.requestPermissionsAsync();
    return newStatus === 'granted';
  } catch (error) {
    console.warn('[notifications] Failed to request notification permission:', error);
    return false;
  }
}

export async function scheduleCompletionNotification(
  taskId: string,
  taskName: string,
  secondsFromNow: number
): Promise<string | null> {
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Timer complete',
        body: `"${taskName}" finished — tap to review.`,
        data: { taskId, type: 'timer-complete' },
        sound: 'default',
        vibrate: [0, 300, 150, 300],
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, secondsFromNow),
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
    });
  } catch (error) {
    console.warn('[notifications] Failed to schedule timer completion:', error);
    return null;
  }
}

export async function scheduleTestNotification(): Promise<boolean> {
  const granted = await requestNotificationPermission();
  if (!granted) return false;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'TaskTracker notifications work',
        body: 'Timer completion alerts are enabled on this device.',
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 1,
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
    });
    return true;
  } catch (error) {
    console.warn('[notifications] Failed to schedule test notification:', error);
    return false;
  }
}

export async function cancelScheduledNotification(notificationId: string | null): Promise<void> {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.warn('[notifications] Failed to cancel scheduled notification:', error);
  }
}

/** Non-dismissible "in progress" notification while a timer runs. Note:
 *  this shows a static message, not a live countdown — a real live-updating
 *  counter needs a foreground service, which is a bigger native addition
 *  we're deliberately not taking on yet (flagged as backlog). */
export async function showRunningNotification(taskName: string): Promise<string | null> {
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Timer running',
        body: `"${taskName}" is in progress`,
        sticky: true,
        autoDismiss: false,
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
      trigger: null,
    });
  } catch (error) {
    console.warn('[notifications] Failed to show running notification:', error);
    return null;
  }
}

export async function dismissNotification(notificationId: string | null): Promise<void> {
  if (!notificationId) return;
  try {
    await Notifications.dismissNotificationAsync(notificationId);
  } catch (error) {
    console.warn('[notifications] Failed to dismiss notification:', error);
  }
}
