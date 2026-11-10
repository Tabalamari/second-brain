import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScheduleStateService, UiModalService } from '../../services';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="board-header">
      <div class="header-left-group">
        <div class="today-pill">
          <span class="label">{{ dateLabelPrefix() }}</span>
          <span class="value">{{ formattedSelectedDate() }}</span>
        </div>
        <button
          type="button"
          class="calendar-toggle-btn"
          [class.active]="isCalendarOpen"
          (click)="toggleView.emit()"
          title="Open Calendar & Day Notes">
          {{ isCalendarOpen ? '📋 Board' : '📅 Calendar' }}
        </button>
      </div>

      <h1 class="board-title">Second Brain</h1>

      <div class="header-right-group">
        <button
          type="button"
          class="header-icon-btn"
          (click)="uiModal.openPrintModal('all')"
          title="Print or Share Daily Schedule">
          🖨️ Print / Share
        </button>
        <button
          type="button"
          class="header-icon-btn"
          (click)="scheduleState.cycleCircadianMode()"
          title="Switch Circadian Theme (Auto / Morning / Day / Dusk)">
          {{ circadianIcon() }}
        </button>
        <div class="clock-badge">
          <span>{{ currentTime() }}</span>
        </div>
      </div>
    </header>
  `
})
export class HeaderComponent implements OnInit, OnDestroy {
  readonly scheduleState = inject(ScheduleStateService);
  readonly uiModal = inject(UiModalService);

  @Input() isCalendarOpen = false;
  @Output() readonly toggleView = new EventEmitter<void>();

  readonly currentTime = signal<string>('');
  private clockIntervalId: ReturnType<typeof setInterval> | null = null;

  readonly isTodaySelected = computed(() => {
    return this.scheduleState.selectedDateIso() === this.scheduleState.toLocalIsoDate(new Date());
  });

  readonly dateLabelPrefix = computed(() => (this.isTodaySelected() ? 'Today:' : 'Date:'));

  readonly formattedSelectedDate = computed(() => {
    const dateObj = this.scheduleState.parseIsoDateLocal(this.scheduleState.selectedDateIso());
    return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  readonly circadianIcon = computed(() => {
    const mode = this.scheduleState.circadianMode();
    const resolved = this.scheduleState.resolvedCircadianTheme();
    const emoji = resolved === 'morning' ? '🌅' : resolved === 'day' ? '☀️' : '🌙';
    return mode === 'auto' ? `${emoji} Auto` : emoji;
  });

  ngOnInit(): void {
    this.updateClock();
    this.clockIntervalId = setInterval(() => this.updateClock(), 1000);
  }

  ngOnDestroy(): void {
    if (this.clockIntervalId !== null) {
      clearInterval(this.clockIntervalId);
    }
  }

  private updateClock(): void {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    this.currentTime.set(`${hours}:${minutes}`);
  }
}

