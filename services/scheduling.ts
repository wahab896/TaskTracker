import { requestNotificationPermission } from '@/services/notifications';
import { Task } from '@/types';
import * as Notifications from 'expo-notifications';

/** Cancels every reminder notification currently associated with a task. */
export async function cancelRemindersForTask(taskId: string): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const toCancel = scheduled.filter((n) => n.content.data?.taskId === taskId);
    await Promise.all(
      toCancel.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
    );
  } catch {
    // Not supported in current runtime (e.g. Expo Go) — safe to ignore
  }
}

/** Cancels any existing reminders for this task, then schedules fresh ones
 *  based on its current `schedule` field. Pass a task with schedule=null
 *  to just clear reminders. */
export async function scheduleRemindersForTask(task: Task): Promise<void> {
  await cancelRemindersForTask(task.id);
  if (!task.schedule) return;

  const granted = await requestNotificationPermission();
  if (!granted) return;

  const [hour, minute] = task.schedule.scheduledTime.split(':').map(Number);
  const content = {
    title: 'Task reminder',
    body: `Time to work on "${task.name}"`,
    data: { taskId: task.id, type: 'reminder' as const },
  };

  try {
    if (task.schedule.frequency === 'daily') {
      await Notifications.scheduleNotificationAsync({
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
      });
    } else if (task.schedule.frequency === 'weekly' && task.schedule.daysOfWeek) {
      // expo-notifications weekday: 1=Sunday ... 7=Saturday
      for (const day of task.schedule.daysOfWeek) {
        await Notifications.scheduleNotificationAsync({
          content,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: day + 1,
            hour,
            minute,
          },
        });
      }
    } else if (task.schedule.frequency === 'once' && task.schedule.scheduledDate) {
      const fireDate = new Date(task.schedule.scheduledDate);
      fireDate.setHours(hour, minute, 0, 0);
      if (fireDate.getTime() > Date.now()) {
        await Notifications.scheduleNotificationAsync({
          content,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: fireDate,
          },
        });
      }
    }
  } catch {
    // Not supported in current runtime — safe to ignore
  }
}

/** Rebuilds every task's reminders from scratch. Call once on app boot so
 *  reminders stay correct even after a reinstall or update. */
export async function resyncAllReminders(tasks: Task[]): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const reminderIds = scheduled
      .filter((n) => n.content.data?.type === 'reminder')
      .map((n) => n.identifier);
    await Promise.all(reminderIds.map((id) => Notifications.cancelScheduledNotificationAsync(id)));

    for (const task of tasks) {
      if (task.schedule) {
        await scheduleRemindersForTask(task);
      }
    }
  } catch {
    // Not supported in current runtime — safe to ignore
  }
}