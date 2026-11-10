import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MeetingItem, ScheduleItemType, TaskItem } from '../../models';
import { UiModalService } from '../../services';
import { ItemCardComponent } from '../item-card/item-card.component';

@Component({
  selector: 'app-schedule-column',
  standalone: true,
  imports: [CommonModule, ItemCardComponent],
  template: `
    <section
      class="block-card"
      [class.meetings-block]="type === 'meeting'"
      [class.tasks-block]="type === 'task'">
      <div class="block-header">
        <h2>{{ title }}</h2>
        <div class="block-header-actions">
          <button
            type="button"
            class="icon-pill-btn"
            (click)="onOpenPrint()"
            [title]="'Print or share only ' + (type === 'meeting' ? 'meetings' : 'tasks')">
            🖨️
          </button>
          <button
            type="button"
            class="add-btn"
            (click)="uiModal.openAddModal(type)"
            [title]="'Add ' + (type === 'meeting' ? 'a meeting' : 'task')">
            +
          </button>
        </div>
      </div>

      <!-- Upper Section: Incomplete -->
      <div class="section-box upper-section" [attr.data-type]="type">
        @if (incompleteItems.length === 0) {
          <div class="empty-placeholder">{{ emptyPlaceholderText }}</div>
        } @else {
          @for (item of incompleteItems; track item.id) {
            <app-item-card [item]="item" [type]="type" />
          }
        }
      </div>

      <!-- Lower Section: Completed -->
      <div class="section-box lower-section" [attr.data-type]="type">
        @if (completedItems.length === 0) {
          <div class="empty-placeholder">{{ completedPlaceholderText }}</div>
        } @else {
          @for (item of completedItems; track item.id) {
            <app-item-card [item]="item" [type]="type" />
          }
        }
      </div>
    </section>
  `
})
export class ScheduleColumnComponent {
  readonly uiModal = inject(UiModalService);

  @Input({ required: true }) title!: string;
  @Input({ required: true }) type!: ScheduleItemType;
  @Input({ required: true }) incompleteItems: (MeetingItem | TaskItem)[] = [];
  @Input({ required: true }) completedItems: (MeetingItem | TaskItem)[] = [];
  @Input() emptyPlaceholderText = 'Nothing scheduled';
  @Input() completedPlaceholderText = 'None completed';

  onOpenPrint(): void {
    this.uiModal.openPrintModal(this.type === 'meeting' ? 'meetings' : 'tasks');
  }
}
