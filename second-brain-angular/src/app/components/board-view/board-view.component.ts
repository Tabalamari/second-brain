import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ScheduleStateService } from '../../services';
import { ScheduleColumnComponent } from '../schedule-column/schedule-column.component';
import { TimerWidgetComponent } from '../timer-widget/timer-widget.component';

@Component({
  selector: 'app-board-view',
  standalone: true,
  imports: [CommonModule, ScheduleColumnComponent, TimerWidgetComponent],
  template: `
    <main class="columns-grid">
    <div class="columns-grid" id="board-view">
      <!-- Column 1: Meetings -->
      <app-schedule-column
        title="Meetings"
        title="Meeting schedule:"
        type="meeting"
        [incompleteItems]="scheduleState.incompleteMeetings()"
        [completedItems]="scheduleState.completedMeetings()"
        emptyPlaceholderText="No upcoming meetings" />
        emptyPlaceholderText="No upcoming meetings"
        completedPlaceholderText="No past meetings" />

      <!-- Column 2: Tasks -->
      <app-schedule-column
        title="Tasks"
        title="Task schedule:"
        type="task"
        [incompleteItems]="scheduleState.incompleteTasks()"
        [completedItems]="scheduleState.completedTasks()"
        emptyPlaceholderText="All tasks completed! 🎉" />
        emptyPlaceholderText="No active tasks"
        completedPlaceholderText="No tasks completed" />

      <!-- Column 3: Analog + Digital Timer -->
      <app-timer-widget />
    </main>
    </div>
  `
})
export class BoardViewComponent implements OnInit {
  readonly scheduleState = inject(ScheduleStateService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const dateParam = params.get('date');
        if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
          this.scheduleState.setSelectedDate(dateParam);
        }
      });
  }
}
