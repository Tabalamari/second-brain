import { Injectable } from '@angular/core';
import {
  DEFAULT_APP_STATE,
  SecondBrainState,
  STORAGE_KEY
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  loadState(): SecondBrainState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SecondBrainState>;
        return this.normalizeState(parsed);
      }
    } catch (e) {
      console.error('Failed to load state from localStorage:', e);
    }

    const fallback = this.normalizeState(
      JSON.parse(JSON.stringify(DEFAULT_APP_STATE))
    );
    this.saveState(fallback);
    return fallback;
  }

  saveState(state: SecondBrainState): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save state to localStorage:', e);
    }
  }

  clearState(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear localStorage:', e);
    }
  }

  toIsoDateString(dateObj: Date = new Date()): string {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private normalizeState(partial: Partial<SecondBrainState>): SecondBrainState {
    const todayIso = this.toIsoDateString();
    const meetings = Array.isArray(partial.meetings)
      ? partial.meetings.map(m => ({ ...m, date: m.date || todayIso }))
      : DEFAULT_APP_STATE.meetings.map(m => ({ ...m, date: todayIso }));

    const tasks = Array.isArray(partial.tasks)
      ? partial.tasks.map(t => ({ ...t, date: t.date || todayIso }))
      : DEFAULT_APP_STATE.tasks.map(t => ({ ...t, date: todayIso }));

    return {
      meetings,
      tasks,
      activeItemId:
        partial.activeItemId !== undefined
          ? partial.activeItemId
          : DEFAULT_APP_STATE.activeItemId,
      companionType: partial.companionType || 'cat',
      circadianMode: partial.circadianMode || 'auto',
      timer: {
        totalSeconds:
          partial.timer?.totalSeconds ?? DEFAULT_APP_STATE.timer.totalSeconds,
        remainingSeconds:
          partial.timer?.remainingSeconds ??
          DEFAULT_APP_STATE.timer.remainingSeconds,
        isRunning: false
      }
    };
  }
}

