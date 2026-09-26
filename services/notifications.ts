import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
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
      vibrationPattern: [0, 300, 150, 300],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  } catch {}
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') return true;
    const { status: newStatus } = await Notifications.requestPermissionsAsync();
    return newStatus === 'granted';
  } catch {
    return false;
  }
}

export async function scheduleCompletionNotification(
  taskName: string,
  secondsFromNow: number
): Promise<string | null> {
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Timer complete',
        body: `"${taskName}" finished — tap to review.`,
        vibrate: [0, 300, 150, 300],
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, secondsFromNow),
      },
    });
  } catch {
    return null;
  }
}

export async function cancelScheduledNotification(notificationId: string | null): Promise<void> {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {}
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
  } catch {
    return null;
  }
}

export async function dismissNotification(notificationId: string | null): Promise<void> {
  if (!notificationId) return;
  try {
    await Notifications.dismissNotificationAsync(notificationId);
  } catch {}
}