export interface TimerState {
  totalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  activeItemId?: string | null;
}

export const TIMER_PRESETS_MINUTES = [5, 15, 25, 30, 60] as const;
export type TimerPresetMinutes = (typeof TIMER_PRESETS_MINUTES)[number];

