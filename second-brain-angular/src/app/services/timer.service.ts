import { Injectable, OnDestroy, computed, inject, signal } from '@angular/core';
import { ScheduleItemType } from '../models';
import { AudioService } from './audio.service';
import { ScheduleStateService } from './schedule-state.service';

@Injectable({
  providedIn: 'root'
})
export class TimerService implements OnDestroy {
  private readonly scheduleState = inject(ScheduleStateService);
  private readonly audio = inject(AudioService);

  private readonly initialTimer = this.scheduleState.timerSnapshot();

  readonly totalSeconds = signal<number>(
    this.initialTimer.totalSeconds || 1500
  );
  readonly remainingSeconds = signal<number>(
    this.initialTimer.remainingSeconds ?? 1500
  );
  readonly isRunning = signal<boolean>(false);
  readonly activePresetMinutes = signal<number>(25);
  readonly RING_CIRCUMFERENCE = 515; // 2 * PI * 82

  private intervalId: ReturnType<typeof setInterval> | null = null;

  readonly statusBadgeText = computed(() =>
    this.scheduleState.activeItem() ? 'In progress' : 'Inactive'
  );

  readonly activeItemTitle = computed(
    () => this.scheduleState.activeItem()?.text || 'Select a task or meeting'
  );

  readonly timeDisplayText = computed(() => {
    const remSecs = Math.max(0, this.remainingSeconds());
    if (remSecs >= 60) {
      return `${Math.floor(remSecs / 60)} min`;
    }
    return `${remSecs} sec`;
  });

  readonly sublabelDisplayText = computed(() => {
    const remSecs = Math.max(0, this.remainingSeconds());
    const secs = remSecs % 60;
    if (remSecs >= 60) {
      return secs > 0 ? `${secs} sec` : 'remaining';
    }
    return 'remaining';
  });

  readonly remRatio = computed(() => {
    const totalSecs = this.totalSeconds() || 1500;
    const remSecs = Math.max(0, this.remainingSeconds());
    const maxDialSecs = Math.max(3600, totalSecs);
    return Math.max(0, Math.min(1, remSecs / maxDialSecs));
  });

  readonly strokeDashoffset = computed(() => {
    return this.RING_CIRCUMFERENCE * (1 - this.remRatio());
  });

  readonly handRotationDegrees = computed(() => this.remRatio() * 360);

  selectItem(id: string, type: ScheduleItemType): void {
    this.scheduleState.setActiveItemId(id);
    const active = this.scheduleState.activeItem();
    if (active) {
      const fallback =
        active.type === 'task' ? active.durationMinutes : 25;
      this.configureForItem(active.text, type, fallback);
    }
  }

  toggleStartPause(): void {
    this.toggleTimer();
  }

  applyPresetMinutes(mins: number): void {
    this.setPresetMinutes(mins);
  }

  completeActiveItem(): void {
    const active = this.scheduleState.activeItem();
    if (!active) return;
    this.pauseTimer();
    this.scheduleState.setItemCompleted(active.id, active.type, true);
  }

  toggleTimer(): void {
    if (this.isRunning()) {
      this.pauseTimer();
    } else {
      this.startTimer();
    }
  }

  startTimer(): void {
    this.isRunning.set(true);
    this.clearTimerInterval();

    this.intervalId = setInterval(() => {
      const rem = this.remainingSeconds();
      if (rem > 0) {
        this.remainingSeconds.set(rem - 1);
        this.persistTimer();
      } else {
        this.pauseTimer();
        this.audio.playTimerCompletionSound();
        const activeTitle =
          this.scheduleState.activeItem()?.text || 'Task';
        alert(`⏱️ Time is up for: "${activeTitle}"!`);
      }
    }, 1000);

    this.persistTimer();
  }

  pauseTimer(): void {
    this.isRunning.set(false);
    this.clearTimerInterval();
    this.persistTimer();
  }

  resetTimer(): void {
    this.pauseTimer();
    this.remainingSeconds.set(this.totalSeconds());
    this.persistTimer();
  }

  setPresetMinutes(mins: number): void {
    this.activePresetMinutes.set(mins);
    this.pauseTimer();
    this.totalSeconds.set(mins * 60);
    this.remainingSeconds.set(mins * 60);
    this.persistTimer();
  }

  configureForItem(
    itemText: string,
    type: ScheduleItemType,
    fallbackDurationMinutes?: number | null
  ): void {
    this.pauseTimer();
    const parsedMins =
      type === 'task'
        ? this.scheduleState.parseMinutesFromText(itemText) ||
          fallbackDurationMinutes
        : 25;
    const mins = parsedMins || 25;
    this.totalSeconds.set(mins * 60);
    this.remainingSeconds.set(mins * 60);
    this.persistTimer();
  }

  ngOnDestroy(): void {
    this.clearTimerInterval();
  }

  private clearTimerInterval(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private persistTimer(): void {
    this.scheduleState.syncTimerSnapshot({
      totalSeconds: this.totalSeconds(),
      remainingSeconds: this.remainingSeconds(),
      isRunning: this.isRunning()
    });
  }
}
