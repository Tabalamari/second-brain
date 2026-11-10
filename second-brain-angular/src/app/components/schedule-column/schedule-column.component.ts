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
    <section class="column-card">
      <div class="column-header">
        <h2>{{ title }}</h2>
        <div class="col-header-actions">
          <button
            type="button"
            class="col-action-btn"
            (click)="onOpenPrint()"
            [title]="'Print/Share ' + title">
            🖨️
          </button>
          <button
            type="button"
            class="add-btn"
            (click)="uiModal.openAddModal(type)"
            [title]="'Add ' + (type === 'meeting' ? 'Meeting' : 'Task')">
            +
          </button>
        </div>
      </div>

      <!-- Upper Section: Incomplete -->
      <div class="items-list upper-section">
        @if (incompleteItems.length === 0) {
          <div class="empty-placeholder">{{ emptyPlaceholderText }}</div>
        } @else {
          @for (item of incompleteItems; track item.id) {
            <app-item-card [item]="item" [type]="type" />
          }
        }
      </div>

      <hr class="section-divider" />

      <!-- Lower Section: Completed -->
      <div class="items-list lower-section">
        @for (item of completedItems; track item.id) {
          <app-item-card [item]="item" [type]="type" />
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

  onOpenPrint(): void {
    this.uiModal.openPrintModal(this.type === 'meeting' ? 'meetings' : 'tasks');
  }
}

