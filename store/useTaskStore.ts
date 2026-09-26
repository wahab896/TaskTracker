import {
  cancelScheduledNotification,
  dismissNotification,
  requestNotificationPermission,
  scheduleCompletionNotification,
  showRunningNotification,
} from '@/services/notifications';
import { loadData, saveData } from '@/services/storage';
import { ActiveTimer, AppData, Note, NoteItem, Session, Task, TaskStatus, Topic } from '@/types';
import * as Crypto from 'expo-crypto';
import { create } from 'zustand';

interface TaskStore extends AppData {
  isLoaded: boolean;
  initialize: () => Promise<void>;

  addTopic: (name: string, color: string) => Topic;
  updateTopic: (topicId: string, name: string) => void;
  deleteTopic: (topicId: string) => void;

  addTask: (params: Omit<Task, 'id' | 'createdAt' | 'completedAt' | 'status'>) => Task;
  updateTask: (taskId: string, name: string) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  updateTaskSchedule: (taskId: string, schedule: Task['schedule']) => void;
  deleteTask: (taskId: string) => void;

  startSession: (taskId: string, type: Task['timerMode']) => Session;
  endSession: (sessionId: string, stoppedManually: boolean) => void;

  addNote: (taskId: string, items: NoteItem[]) => Note;
  updateNote: (noteId: string, items: NoteItem[]) => void;

  beginTimer: (taskId: string, durationSeconds: number) => Promise<{ ok: boolean; reason?: string }>;
  pauseTimer: () => Promise<void>;
  resumeTimer: () => Promise<void>;
  stopTimer: (stoppedManually: boolean) => Promise<void>;
  checkTimerExpiry: () => Promise<boolean>;

  wipeAllData: () => void;

  getTasksByTopic: (topicId: string) => Task[];
  getSessionsByTask: (taskId: string) => Session[];
  getTotalSecondsForTask: (taskId: string) => number;
  getTotalSecondsForTopic: (topicId: string) => number;
}

async function persist(get: () => TaskStore) {
  const { version, topics, tasks, sessions, notes, activeTimer } = get();
  await saveData({ version, topics, tasks, sessions, notes, activeTimer });
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  version: 1,
  topics: [],
  tasks: [],
  sessions: [],
  notes: [],
  activeTimer: null,
  isLoaded: false,

  initialize: async () => {
    const data = await loadData();
    set({ ...data, activeTimer: data.activeTimer ?? null, isLoaded: true });
  },

  addTopic: (name, color) => {
    const topic: Topic = { id: Crypto.randomUUID(), name, color, createdAt: new Date().toISOString() };
    set((state) => ({ topics: [...state.topics, topic] }));
    persist(get);
    return topic;
  },

  updateTopic: (topicId, name) => {
    set((state) => ({ topics: state.topics.map((t) => (t.id === topicId ? { ...t, name } : t)) }));
    persist(get);
  },

  deleteTopic: (topicId) => {
    set((state) => ({
      topics: state.topics.filter((t) => t.id !== topicId),
      tasks: state.tasks.filter((t) => t.topicId !== topicId),
      sessions: state.sessions.filter((s) => {
        const task = state.tasks.find((t) => t.id === s.taskId);
        return task ? task.topicId !== topicId : true;
      }),
      notes: state.notes.filter((n) => {
        const task = state.tasks.find((t) => t.id === n.taskId);
        return task ? task.topicId !== topicId : true;
      }),
    }));
    persist(get);
  },

  addTask: (params) => {
    const task: Task = {
      ...params,
      id: Crypto.randomUUID(),
      status: 'current',
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    set((state) => ({ tasks: [...state.tasks, task] }));
    persist(get);
    return task;
  },

  updateTask: (taskId, name) => {
    set((state) => ({ tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, name } : t)) }));
    persist(get);
  },

  updateTaskStatus: (taskId, status) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? { ...t, status, completedAt: status === 'completed' ? new Date().toISOString() : t.completedAt }
          : t
      ),
    }));
    persist(get);
  },

  updateTaskSchedule: (taskId, schedule) => {
    set((state) => ({ tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, schedule } : t)) }));
    persist(get);
  },

  deleteTask: (taskId) => {
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== taskId),
      sessions: state.sessions.filter((s) => s.taskId !== taskId),
      notes: state.notes.filter((n) => n.taskId !== taskId),
    }));
    persist(get);
  },

  startSession: (taskId, type) => {
    const session: Session = {
      id: Crypto.randomUUID(),
      taskId,
      startTime: new Date().toISOString(),
      endTime: null,
      durationSeconds: 0,
      type,
      stoppedManually: false,
    };
    set((state) => ({ sessions: [...state.sessions, session] }));
    persist(get);
    return session;
  },

  endSession: (sessionId, stoppedManually) => {
    set((state) => ({
      sessions: state.sessions.map((s) => {
        if (s.id !== sessionId) return s;
        const endTime = new Date().toISOString();
        const durationSeconds = Math.floor(
          (new Date(endTime).getTime() - new Date(s.startTime).getTime()) / 1000
        );
        return { ...s, endTime, durationSeconds, stoppedManually };
      }),
    }));
    persist(get);
  },

  addNote: (taskId, items) => {
    const now = new Date().toISOString();
    const note: Note = { id: Crypto.randomUUID(), taskId, items, createdAt: now, updatedAt: now };
    set((state) => ({ notes: [...state.notes, note] }));
    persist(get);
    return note;
  },

  updateNote: (noteId, items) => {
    set((state) => ({
      notes: state.notes.map((n) => (n.id === noteId ? { ...n, items, updatedAt: new Date().toISOString() } : n)),
    }));
    persist(get);
  },

  // --- Active timer: global, persisted, survives navigation + app restarts ---

  beginTimer: async (taskId, durationSeconds) => {
    const state = get();
    if (state.activeTimer) {
      return { ok: false, reason: 'A timer is already running for another task. Stop it first.' };
    }
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return { ok: false, reason: 'Task not found.' };

    await requestNotificationPermission();

    const session = state.startSession(taskId, task.timerMode);
    const endTime = Date.now() + durationSeconds * 1000;
    const completionNotificationId = await scheduleCompletionNotification(task.name, durationSeconds);
    const runningNotificationId = await showRunningNotification(task.name);

    const activeTimer: ActiveTimer = {
      taskId,
      sessionId: session.id,
      endTime,
      completionNotificationId,
      runningNotificationId,
      paused: false,
      remainingAtPause: null,
    };
    set({ activeTimer });
    persist(get);
    return { ok: true };
  },

  pauseTimer: async () => {
    const { activeTimer } = get();
    if (!activeTimer || activeTimer.paused) return;

    const remaining = Math.max(0, Math.round((activeTimer.endTime - Date.now()) / 1000));
    await cancelScheduledNotification(activeTimer.completionNotificationId);

    set({
      activeTimer: { ...activeTimer, paused: true, remainingAtPause: remaining, completionNotificationId: null },
    });
    persist(get);
  },

  resumeTimer: async () => {
    const { activeTimer, tasks } = get();
    if (!activeTimer || !activeTimer.paused || activeTimer.remainingAtPause == null) return;

    const task = tasks.find((t) => t.id === activeTimer.taskId);
    const endTime = Date.now() + activeTimer.remainingAtPause * 1000;
    const completionNotificationId = task
      ? await scheduleCompletionNotification(task.name, activeTimer.remainingAtPause)
      : null;

    set({ activeTimer: { ...activeTimer, paused: false, endTime, remainingAtPause: null, completionNotificationId } });
    persist(get);
  },

  stopTimer: async (stoppedManually) => {
    const { activeTimer } = get();
    if (!activeTimer) return;

    get().endSession(activeTimer.sessionId, stoppedManually);
    await cancelScheduledNotification(activeTimer.completionNotificationId);
    await dismissNotification(activeTimer.runningNotificationId);

    set({ activeTimer: null });
    persist(get);
  },

  checkTimerExpiry: async () => {
    const { activeTimer } = get();
    if (!activeTimer || activeTimer.paused) return false;
    if (Date.now() >= activeTimer.endTime) {
      await get().stopTimer(false);
      return true;
    }
    return false;
  },

  wipeAllData: () => {
    set({ topics: [], tasks: [], sessions: [], notes: [], activeTimer: null });
    persist(get);
  },

  getTasksByTopic: (topicId) => get().tasks.filter((t) => t.topicId === topicId),
  getSessionsByTask: (taskId) => get().sessions.filter((s) => s.taskId === taskId),
  getTotalSecondsForTask: (taskId) =>
    get().sessions.filter((s) => s.taskId === taskId).reduce((sum, s) => sum + s.durationSeconds, 0),
  getTotalSecondsForTopic: (topicId) => {
    const taskIds = get().tasks.filter((t) => t.topicId === topicId).map((t) => t.id);
    return get().sessions.filter((s) => taskIds.includes(s.taskId)).reduce((sum, s) => sum + s.durationSeconds, 0);
  },
}));