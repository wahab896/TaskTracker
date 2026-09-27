export type TaskStatus = 'current' | 'completed' | 'expired';
export type TimerMode = 'simple' | 'pomodoro';
export type ScheduleFrequency = 'daily' | 'weekly' | 'once';

export interface PomodoroConfig {
  workMinutes: number;
  breakMinutes: number;
  cyclesBeforeLongBreak: number;
}

export interface Schedule {
  frequency: ScheduleFrequency;
  scheduledTime: string; // "HH:mm"
  daysOfWeek: number[] | null; // 0-6, only for 'weekly'
  scheduledDate: string | null; // ISO date, only for 'once'
}

export interface Topic {
  id: string;
  name: string;
  color: string;
  pinned: boolean;
  createdAt: string;
}

export interface Task {
  id: string;
  topicId: string;
  name: string;
  pinned: boolean;
  timerMode: TimerMode;
  pomodoroConfig: PomodoroConfig | null;
  schedule: Schedule | null;
  expiryDate: string | null;
  status: TaskStatus;
  createdAt: string;
  completedAt: string | null;
}

export interface Session {
  id: string;
  taskId: string;
  startTime: string;
  endTime: string | null;
  durationSeconds: number;
  type: TimerMode;
  stoppedManually: boolean;
}

export interface NoteItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Note {
  id: string;
  taskId: string;
  items: NoteItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ActiveTimer {
  taskId: string;
  sessionId: string;
  endTime: number; // epoch ms — always the source of truth
  completionNotificationId: string | null;
  runningNotificationId: string | null;
  paused: boolean;
  remainingAtPause: number | null;
}

export interface AppData {
  version: number;
  topics: Topic[];
  tasks: Task[];
  sessions: Session[];
  notes: Note[];
  activeTimer: ActiveTimer | null;
}
