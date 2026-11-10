export type ScheduleItemType = 'meeting' | 'task';

export interface BaseScheduleItem {
  id: string;
  text: string;
  completed: boolean;
  date?: string; // ISO date string: YYYY-MM-DD
}

export interface MeetingItem extends BaseScheduleItem {
  time?: string; // e.g. '12:30'
}

export interface TaskItem extends BaseScheduleItem {
  durationMinutes?: number | null; // e.g. 25, 30
}

export type ScheduleItem =
  | (MeetingItem & { type: 'meeting' })
  | (TaskItem & { type: 'task' });

