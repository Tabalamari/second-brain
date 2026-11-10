import { Injectable, computed, effect, inject, signal } from '@angular/core';
import {
  CircadianMode,
  CompanionType,
  MeetingItem,
  ScheduleItem,
  ScheduleItemType,
  SecondBrainState,
  TaskItem,
  TimerState
} from '../models';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class ScheduleStateService {
  private readonly storage = inject(StorageService);
  private readonly initialState = this.storage.loadState();

  // Core reactive signals
  readonly meetings = signal<MeetingItem[]>(this.initialState.meetings);
  readonly tasks = signal<TaskItem[]>(this.initialState.tasks);
  readonly activeItemId = signal<string | null>(this.initialState.activeItemId);
  readonly selectedDateIso = signal<string>(this.storage.toIsoDateString());
  readonly companionType = signal<CompanionType>(
    this.initialState.companionType || 'cat'
  );
  readonly circadianMode = signal<CircadianMode>(
    this.initialState.circadianMode || 'auto'
  );
  readonly timerSnapshot = signal<TimerState>(this.initialState.timer);

  // Computed signals for the currently selected day
  readonly meetingsForSelectedDay = computed(() => {
    const targetIso = this.selectedDateIso();
    const todayIso = this.storage.toIsoDateString();
    return this.meetings().filter(m => (m.date || todayIso) === targetIso);
  });

  readonly incompleteMeetings = computed(() =>
    this.meetingsForSelectedDay().filter(m => !m.completed)
  );

  readonly completedMeetings = computed(() =>
    this.meetingsForSelectedDay().filter(m => m.completed)
  );

  readonly tasksForSelectedDay = computed(() => {
    const targetIso = this.selectedDateIso();
    const todayIso = this.storage.toIsoDateString();
    return this.tasks().filter(t => (t.date || todayIso) === targetIso);
  });

  readonly incompleteTasks = computed(() =>
    this.tasksForSelectedDay().filter(t => !t.completed)
  );

  readonly completedTasks = computed(() =>
    this.tasksForSelectedDay().filter(t => t.completed)
  );

  readonly activeItem = computed<ScheduleItem | null>(() => {
    const id = this.activeItemId();
    if (!id) return null;
    const task = this.tasks().find(t => t.id === id);
    if (task) return { ...task, type: 'task' };
    const meeting = this.meetings().find(m => m.id === id);
    if (meeting) return { ...meeting, type: 'meeting' };
    return null;
  });

  readonly resolvedCircadianTheme = computed<'morning' | 'day' | 'dusk'>(() => {
    const mode = this.circadianMode();
    if (mode === 'morning' || mode === 'day' || mode === 'dusk') {
      return mode;
    }
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'day';
    return 'dusk';
  });

  toLocalIsoDate(dateObj: Date = new Date()): string {
    return this.storage.toIsoDateString(dateObj);
  }

  parseIsoDateLocal(isoStr: string): Date {
    if (!isoStr) return new Date();
    const parts = isoStr.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return new Date();
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  formatShortMonthDay(isoStr: string): string {
    const d = this.parseIsoDateLocal(isoStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  toggleComplete(id: string, type: ScheduleItemType): void {
    const list = type === 'meeting' ? this.meetings() : this.tasks();
    const found = list.find(item => item.id === id);
    if (!found) return;
    this.setItemCompleted(id, type, !found.completed);
  }

  constructor() {
    // Automatically persist state to localStorage whenever any signal changes
    effect(() => {
      const state: SecondBrainState = {
        meetings: this.meetings(),
        tasks: this.tasks(),
        activeItemId: this.activeItemId(),
        companionType: this.companionType(),
        circadianMode: this.circadianMode(),
        timer: this.timerSnapshot()
      };
      this.storage.saveState(state);
    });
  }

  parseMinutesFromText(text: string): number | null {
    if (!text) return null;

    const minMatch = text.match(/(\d+)\s*(хв|min|m|хвилин)/i);
    if (minMatch) return parseInt(minMatch[1], 10);

    const hrMatch = text.match(/(\d+)\s*(годин|години|година|ч|h|hours)/i);
    if (hrMatch) return parseInt(hrMatch[1], 10) * 60;

    return null;
  }

  setSelectedDate(dateIso: string): void {
    this.selectedDateIso.set(dateIso);
  }

  getItemsForDate(dateIso: string): {
    meetings: MeetingItem[];
    tasks: TaskItem[];
  } {
    const todayIso = this.storage.toIsoDateString();
    return {
      meetings: this.meetings().filter(m => (m.date || todayIso) === dateIso),
      tasks: this.tasks().filter(t => (t.date || todayIso) === dateIso)
    };
  }

  addItem(
    type: ScheduleItemType,
    text: string,
    timeOrDuration?: string,
    dateIso?: string
  ): void {
    const trimmedText = text.trim();
    const trimmedMeta = (timeOrDuration || '').trim();
    const targetDate =
      dateIso || this.selectedDateIso() || this.storage.toIsoDateString();

    if (!trimmedText) return;

    if (type === 'meeting') {
      let fullText = trimmedText;
      if (
        trimmedMeta &&
        !trimmedText.toLowerCase().startsWith(trimmedMeta.toLowerCase())
      ) {
        fullText = `${trimmedMeta} ${trimmedText}`;
      }
      const newMeeting: MeetingItem = {
        id: 'm_' + Date.now(),
        text: fullText,
        time:
          trimmedMeta || trimmedText.match(/\b\d{1,2}:\d{2}\b/)?.[0] || '',
        date: targetDate,
        completed: false
      };
      this.meetings.update(list => [newMeeting, ...list]);
    } else {
      let fullText = trimmedText;
      if (
        trimmedMeta &&
        !trimmedText.toLowerCase().includes(trimmedMeta.toLowerCase())
      ) {
        fullText = `${trimmedText} ${trimmedMeta}`;
      }
      const newTask: TaskItem = {
        id: 't_' + Date.now(),
        text: fullText,
        durationMinutes: this.parseMinutesFromText(fullText),
        date: targetDate,
        completed: false
      };
      this.tasks.update(list => [newTask, ...list]);
    }
  }

  updateItem(
    id: string,
    type: ScheduleItemType,
    text: string,
    timeOrDuration?: string,
    dateIso?: string
  ): number | null {
    const trimmedText = text.trim();
    const trimmedMeta = (timeOrDuration || '').trim();
    if (!trimmedText) return null;

    let updatedDurationMinutes: number | null = null;

    if (type === 'meeting') {
      let fullText = trimmedText;
      if (
        trimmedMeta &&
        !trimmedText.toLowerCase().startsWith(trimmedMeta.toLowerCase())
      ) {
        fullText = `${trimmedMeta} ${trimmedText}`;
      }
      const timeVal =
        trimmedMeta || trimmedText.match(/\b\d{1,2}:\d{2}\b/)?.[0] || '';
      this.meetings.update(list =>
        list.map(m =>
          m.id === id
            ? {
                ...m,
                text: fullText,
                time: timeVal,
                date: dateIso || m.date || this.storage.toIsoDateString()
              }
            : m
        )
      );
    } else {
      let fullText = trimmedText;
      if (
        trimmedMeta &&
        !trimmedText.toLowerCase().includes(trimmedMeta.toLowerCase())
      ) {
        fullText = `${trimmedText} ${trimmedMeta}`;
      }
      updatedDurationMinutes = this.parseMinutesFromText(fullText);
      this.tasks.update(list =>
        list.map(t =>
          t.id === id
            ? {
                ...t,
                text: fullText,
                durationMinutes: updatedDurationMinutes,
                date: dateIso || t.date || this.storage.toIsoDateString()
              }
            : t
        )
      );
    }

    return updatedDurationMinutes;
  }

  deleteItem(id: string, type: ScheduleItemType): void {
    if (type === 'meeting') {
      this.meetings.update(list => list.filter(m => m.id !== id));
    } else {
      this.tasks.update(list => list.filter(t => t.id !== id));
    }

    if (this.activeItemId() === id) {
      this.activeItemId.set(null);
    }
  }

  setItemCompleted(
    id: string,
    type: ScheduleItemType,
    completed: boolean
  ): void {
    if (type === 'meeting') {
      this.meetings.update(list =>
        list.map(m => (m.id === id ? { ...m, completed } : m))
      );
    } else {
      this.tasks.update(list =>
        list.map(t => (t.id === id ? { ...t, completed } : t))
      );
    }

    if (completed && this.activeItemId() === id) {
      this.activeItemId.set(null);
    }
  }

  setActiveItemId(id: string | null): void {
    this.activeItemId.set(id);
  }

  toggleCompanionType(): CompanionType {
    const next: CompanionType =
      this.companionType() === 'plant' ? 'cat' : 'plant';
    this.companionType.set(next);
    return next;
  }

  cycleCircadianMode(): CircadianMode {
    const order: CircadianMode[] = ['auto', 'morning', 'day', 'dusk'];
    const next =
      order[(order.indexOf(this.circadianMode()) + 1) % order.length];
    this.circadianMode.set(next);
    return next;
  }

  syncTimerSnapshot(timer: TimerState): void {
    this.timerSnapshot.set(timer);
  }
}

