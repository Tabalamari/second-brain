import { Component, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ScheduleStateService, TimerService, UiModalService } from '../../services';

@Component({
  selector: 'app-item-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div
      class="modal-overlay"
      id="item-modal"
      [class.open]="modalState().isOpen"
      (click)="onOverlayClick($event)">
      <div class="modal-card">
        <div class="modal-header">
          <h3>{{ modalTitle() }}</h3>
          <h3 id="modal-title">{{ modalTitle() }}</h3>
          <button
            type="button"
            class="modal-close"
            id="modal-close-btn"
            (click)="uiModal.closeItemModal()">
            &times;
          </button>
        </div>

        <form [formGroup]="itemForm" (ngSubmit)="onSubmit()">
        <form id="item-form" [formGroup]="itemForm" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="item-title-input">Title / Description</label>
            <label for="item-text" id="item-text-label">Text / Name:</label>
            <input
              type="text"
              id="item-title-input"
              id="item-text"
              formControlName="text"
              placeholder="e.g., Design system review"
              [placeholder]="textFieldPlaceholder()"
              required />
          </div>

          <div class="form-group">
            <label for="item-time-input">{{ timeFieldLabel() }}</label>
          <div class="form-group" id="time-group">
            <label for="item-time">Time / Duration (optional):</label>
            <input
              type="text"
              id="item-time-input"
              id="item-time"
              formControlName="timeOrDuration"
              [placeholder]="timeFieldPlaceholder()"
              required />
              [placeholder]="timeFieldPlaceholder()" />
          </div>

          <div class="form-group">
            <label for="item-date-input">Date</label>
          <div class="form-group" id="date-group">
            <label for="item-date">Date:</label>
            <input
              type="date"
              id="item-date-input"
              id="item-date"
              formControlName="date"
              required />
          </div>

          <div class="modal-actions">
            <button
              type="button"
              class="btn-cancel"
              id="modal-cancel-btn"
              (click)="uiModal.closeItemModal()">
              Cancel
            </button>
            <button
              type="submit"
              class="btn-submit"
              [disabled]="itemForm.invalid">
              {{ submitButtonText() }}
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class ItemModalComponent {
  readonly uiModal = inject(UiModalService);
  readonly scheduleState = inject(ScheduleStateService);
  readonly timer = inject(TimerService);
  private readonly fb = inject(FormBuilder);

  readonly modalState = this.uiModal.itemModal;

  readonly itemForm = this.fb.nonNullable.group({
    text: ['', [Validators.required]],
    timeOrDuration: ['', [Validators.required]],
    timeOrDuration: [''],
    date: ['', [Validators.required]]
  });

  readonly modalTitle = computed(() => {
    const s = this.modalState();
    if (s.editItem) {
      return s.type === 'meeting' ? 'Edit Meeting' : 'Edit Task';
      return s.type === 'meeting' ? 'Edit meeting' : 'Edit task';
    }
    return s.type === 'meeting' ? 'Add New Meeting' : 'Add New Task';
    return s.type === 'meeting' ? 'Add meeting' : 'Add task';
  });

  readonly timeFieldLabel = computed(() =>
    this.modalState().type === 'meeting'
      ? 'Time Range (e.g., 14:00 - 15:00)'
      : 'Duration in Minutes (e.g., 25)'
  );
  readonly textFieldPlaceholder = computed(() => {
    const s = this.modalState();
    if (s.editItem) {
      return s.type === 'meeting'
        ? 'For example: 4:30 PM — Project meeting'
        : 'For example: Prepare a report — 25 min';
    }
    return s.type === 'meeting'
      ? 'For example: 16:30 Project meeting'
      : 'For example: Prepare a report';
  });

  readonly timeFieldPlaceholder = computed(() =>
    this.modalState().type === 'meeting' ? '14:00 - 14:30' : '25'
    this.modalState().type === 'meeting'
      ? 'For example: 16:30'
      : 'For example: 25 min'
  );

  readonly submitButtonText = computed(() =>
    this.modalState().editItem ? 'Save Changes' : 'Save Item'
  );

  constructor() {
    effect(() => {
      const s = this.modalState();
      if (s.isOpen) {
        const editItem = s.editItem;
        let initialTimeOrDuration = '';
        if (editItem) {
          if (s.type === 'meeting') {
            initialTimeOrDuration = (editItem as { time?: string }).time || '';
          } else {
            const mins = (editItem as { durationMinutes?: number | null })
              .durationMinutes;
            initialTimeOrDuration = mins ? String(mins) : '25';
            const parsedDur = this.scheduleState.parseMinutesFromText(
              editItem.text
            );
            initialTimeOrDuration = parsedDur ? `${parsedDur} min` : '';
          }
        }
        this.itemForm.reset({
          text: editItem ? editItem.text : '',
          timeOrDuration: initialTimeOrDuration,
          date:
            s.defaultDateIso ||
            editItem?.date ||
            this.scheduleState.selectedDateIso()
        });
      }
    });
  }

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.uiModal.closeItemModal();
    }
  }

  onSubmit(): void {
    if (this.itemForm.invalid) return;

    const s = this.modalState();
    const { text, timeOrDuration, date } = this.itemForm.getRawValue();
    const trimmedText = text.trim();
    const trimmedTime = timeOrDuration.trim();
    const targetDateIso = date || this.scheduleState.selectedDateIso();

    if (!trimmedText) return;

    if (s.editItem) {
      this.scheduleState.updateItem(
        s.editItem.id,
        s.type,
        trimmedText,
        trimmedTime,
        targetDateIso
      );
      const active = this.scheduleState.activeItem();
      if (active && active.id === s.editItem.id && active.type === s.type) {
        this.timer.selectItem(s.editItem.id, s.type);
      }
    } else {
      this.scheduleState.addItem(s.type, trimmedText, trimmedTime, targetDateIso);
      this.scheduleState.addItem(
        s.type,
        trimmedText,
        trimmedTime,
        targetDateIso
      );
    }

    this.uiModal.closeItemModal();
  }
}
