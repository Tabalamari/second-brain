import { Component, EventEmitter, Output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MeetingItem, TaskItem } from '../../models';
import { ScheduleStateService, UiModalService } from '../../services';
import { ItemCardComponent } from '../item-card/item-card.component';

interface CalendarCell {
  iso: string;
  dayNumber: number;
  isOtherMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  totalCount: number;
  previewItems: Array<{
    id: string;
    kind: 'meeting' | 'task';
    label: string;
    completed: boolean;
  }>;
  moreCount: number;
}

@Component({
  selector: 'app-calendar-view',
  standalone: true,
  imports: [CommonModule, ItemCardComponent],
  template: `
    <section class="calendar-view">
      <!-- Left: Monthly Grid Card -->
      <div class="column-card calendar-main-card">
        <div class="calendar-nav-header">
          <div class="calendar-month-controls">
            <button
              type="button"
              class="cal-nav-btn"
              (click)="prevMonth()"
              title="Previous month">
              ◀
            </button>
            <h2 class="cal-month-title">{{ monthTitle() }}</h2>
            <button
              type="button"
              class="cal-nav-btn"
              (click)="nextMonth()"
              title="Next month">
              ▶
            </button>
          </div>
          <button
            type="button"
            class="cal-today-btn"
            (click)="jumpToToday()">
            Today
          </button>
        </div>

        <!-- Weekdays Row (Starts with Monday!) -->
        <div class="calendar-weekdays-row">
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span class="weekend-label">Sat</span>
          <span class="weekend-label">Sun</span>
        </div>

        <!-- Days Grid -->
        <div class="calendar-days-grid">
          @for (cell of calendarCells(); track cell.iso) {
            <div
              class="cal-day-cell"
              [class.is-other-month]="cell.isOtherMonth"
              [class.is-today]="cell.isToday"
              [class.is-selected]="cell.isSelected"
              (click)="selectDate(cell.iso, cell.isOtherMonth)">
              <div class="cal-day-top">
                <span class="cal-day-number">{{ cell.dayNumber }}</span>
                @if (cell.totalCount > 0) {
                  <span class="cal-day-count">{{ cell.totalCount }}</span>
                }
              </div>

              <div class="cal-day-notes-preview">
                @for (chip of cell.previewItems; track chip.id) {
                  <div
                    class="cal-note-chip"
                    [class.is-meeting]="chip.kind === 'meeting'"
                    [class.is-completed]="chip.completed">
                    {{ chip.label }}
                  </div>
                }
                @if (cell.moreCount > 0) {
                  <div class="cal-more-chip">+{{ cell.moreCount }} more</div>
                }
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Right: Selected Day Notes Panel -->
      <div class="column-card calendar-day-panel">
        <div class="calendar-day-panel-header">
          <div>
            <span class="day-panel-subtitle">Selected Day</span>
            <h2>{{ selectedDayHeading() }}</h2>
          </div>
          <div class="day-panel-add-actions">
            <button
              type="button"
              class="cal-add-note-btn"
              (click)="uiModal.openAddModal('meeting', scheduleState.selectedDateIso())"
              title="Schedule Meeting on this day">
              + Meeting
            </button>
            <button
              type="button"
              class="cal-add-note-btn"
              (click)="uiModal.openAddModal('task', scheduleState.selectedDateIso())"
              title="Add Task on this day">
              + Task
            </button>
          </div>
        </div>

        <div class="day-panel-sections">
          <div class="day-notes-group">
            <h3 class="day-notes-group-title">📅 Meetings</h3>
            <div class="day-notes-list">
              @if (dayMeetings().length === 0) {
                <div class="empty-placeholder">No meetings for this day</div>
              } @else {
                @for (m of dayMeetings(); track m.id) {
                  <app-item-card [item]="m" type="meeting" />
                }
              }
            </div>
          </div>

          <div class="day-notes-group">
            <h3 class="day-notes-group-title">📝 Tasks & Notes</h3>
            <div class="day-notes-list">
              @if (dayTasks().length === 0) {
                <div class="empty-placeholder">No tasks or notes for this day</div>
              } @else {
                @for (t of dayTasks(); track t.id) {
                  <app-item-card [item]="t" type="task" />
                }
              }
            </div>
          </div>
        </div>

        <div class="day-panel-footer">
          <button
            type="button"
            class="timer-btn primary-btn"
            (click)="onOpenDayOnBoard()">
            📋 Open this day on Board
          </button>
        </div>
      </div>
    </section>
  `
})
export class CalendarViewComponent {
  readonly scheduleState = inject(ScheduleStateService);
  readonly uiModal = inject(UiModalService);
  private readonly router = inject(Router);

  @Output() readonly openBoard = new EventEmitter<void>();

  private readonly initialDate = this.scheduleState.parseIsoDateLocal(
    this.scheduleState.selectedDateIso()
  );
  readonly calendarYear = signal<number>(this.initialDate.getFullYear());
  readonly calendarMonth = signal<number>(this.initialDate.getMonth());

  readonly monthTitle = computed(() => {
    const firstDay = new Date(this.calendarYear(), this.calendarMonth(), 1);
    return firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  });

  readonly selectedDayHeading = computed(() => {
    const d = this.scheduleState.parseIsoDateLocal(this.scheduleState.selectedDateIso());
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  });

  readonly dayMeetings = computed<MeetingItem[]>(() =>
    this.scheduleState.meetingsForSelectedDay()
  );

  readonly dayTasks = computed<TaskItem[]>(() =>
    this.scheduleState.tasksForSelectedDay()
  );

  readonly calendarCells = computed<CalendarCell[]>(() => {
    const year = this.calendarYear();
    const month = this.calendarMonth();
    const firstDayOfMonth = new Date(year, month, 1);

    // JS getDay(): 0 = Sun, 1 = Mon ... 6 = Sat
    // Convert to Monday-first index: 0 = Mon ... 6 = Sun
    const mondayFirstOffset = (firstDayOfMonth.getDay() + 6) % 7;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();
    const todayIso = this.scheduleState.toLocalIsoDate(new Date());
    const selectedIso = this.scheduleState.selectedDateIso();
    const allMeetings = this.scheduleState.meetings();
    const allTasks = this.scheduleState.tasks();

    const totalCells = 42;
    const cells: CalendarCell[] = [];

    for (let i = 0; i < totalCells; i++) {
      let cellDate: Date;
      let isOtherMonth = false;

      if (i < mondayFirstOffset) {
        const dayNum = prevMonthDays - mondayFirstOffset + 1 + i;
        cellDate = new Date(year, month - 1, dayNum);
        isOtherMonth = true;
      } else if (i >= mondayFirstOffset + daysInMonth) {
        const dayNum = i - (mondayFirstOffset + daysInMonth) + 1;
        cellDate = new Date(year, month + 1, dayNum);
        isOtherMonth = true;
      } else {
        const dayNum = i - mondayFirstOffset + 1;
        cellDate = new Date(year, month, dayNum);
      }

      const iso = this.scheduleState.toLocalIsoDate(cellDate);
      const meetingsOnDay = allMeetings.filter(m => m.date === iso);
      const tasksOnDay = allTasks.filter(t => t.date === iso);
      const totalCount = meetingsOnDay.length + tasksOnDay.length;

      const combined = [
        ...meetingsOnDay.map(m => ({
          id: m.id,
          kind: 'meeting' as const,
          label: `⏰ ${m.text}`,
          completed: m.completed
        })),
        ...tasksOnDay.map(t => ({
          id: t.id,
          kind: 'task' as const,
          label: `📌 ${t.text}`,
          completed: t.completed
        }))
      ];

      cells.push({
        iso,
        dayNumber: cellDate.getDate(),
        isOtherMonth,
        isToday: iso === todayIso,
        isSelected: iso === selectedIso,
        totalCount,
        previewItems: combined.slice(0, 2),
        moreCount: Math.max(0, combined.length - 2)
      });
    }

    return cells;
  });

  prevMonth(): void {
    if (this.calendarMonth() === 0) {
      this.calendarMonth.set(11);
      this.calendarYear.update(y => y - 1);
    } else {
      this.calendarMonth.update(m => m - 1);
    }
  }

  nextMonth(): void {
    if (this.calendarMonth() === 11) {
      this.calendarMonth.set(0);
      this.calendarYear.update(y => y + 1);
    } else {
      this.calendarMonth.update(m => m + 1);
    }
  }

  jumpToToday(): void {
    const now = new Date();
    this.calendarYear.set(now.getFullYear());
    this.calendarMonth.set(now.getMonth());
    this.scheduleState.setSelectedDate(this.scheduleState.toLocalIsoDate(now));
  }

  selectDate(iso: string, isOtherMonth: boolean): void {
    this.scheduleState.setSelectedDate(iso);
    if (isOtherMonth) {
      const d = this.scheduleState.parseIsoDateLocal(iso);
      this.calendarYear.set(d.getFullYear());
      this.calendarMonth.set(d.getMonth());
    }
  }

  onOpenDayOnBoard(): void {
    this.openBoard.emit();
    this.router.navigate(['/board', this.scheduleState.selectedDateIso()]);
  }
}
