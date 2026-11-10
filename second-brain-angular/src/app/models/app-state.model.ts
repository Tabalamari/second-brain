import { MeetingItem, TaskItem } from './schedule-item.model';
import { TimerState } from './timer-state.model';

export type CompanionType = 'cat' | 'plant';
export type CircadianMode = 'auto' | 'morning' | 'day' | 'dusk';

export interface SecondBrainState {
  meetings: MeetingItem[];
  tasks: TaskItem[];
  activeItemId: string | null;
  companionType?: CompanionType;
  circadianMode?: CircadianMode;
  timer: TimerState;
}

export const STORAGE_KEY = 'SECOND_BRAIN_APP_STATE_V2';

export const DEFAULT_APP_STATE: SecondBrainState = {
  meetings: [
    { id: 'm1', text: '12:30 movie', completed: false, time: '12:30' },
    { id: 'm2', text: '15:00 Meeting', completed: false, time: '15:00' },
    { id: 'm3', text: '10:00 Fitness', completed: true, time: '10:00' }
  ],
  tasks: [
    { id: 't1', text: 'Find a sock', completed: false, durationMinutes: 30 },
    { id: 't2', text: 'Buy a bread', completed: false, durationMinutes: 15 },
    { id: 't3', text: 'Doing project', completed: false, durationMinutes: 180 },
    { id: 't4', text: 'Clean the shoes', completed: true, durationMinutes: 20 }
  ],
  activeItemId: 't1',
  companionType: 'cat',
  circadianMode: 'auto',
  timer: {
    totalSeconds: 16 * 60,
    remainingSeconds: 16 * 60,
    isRunning: false
  }
};

