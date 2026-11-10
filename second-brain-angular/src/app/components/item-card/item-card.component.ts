import { Component, Input, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MeetingItem, ScheduleItemType, TaskItem } from '../../models';
import { AudioService, ScheduleStateService, TimerService, UiModalService } from '../../services';

interface ConfettiBit {
  id: number;
  color: string;
  tx: string;
  ty: string;
  rot: string;
  left: string;
}

@Component({
  selector: 'app-item-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="item-card"
      [class.is-active]="isActive()"
      [class.is-completed]="item.completed"
      [class.is-scribbling]="isScribbling()"
      (click)="onCardClick()"
      (contextmenu)="onContextMenu($event)">
      <span class="item-title">{{ displayText() }}@if (dayBadgeText()) {<span class="item-day-badge">📅 {{ dayBadgeText() }}</span>}@if (item.completed || isScribbling()) {<svg class="pencil-strike-svg" viewBox="0 0 240 16" preserveAspectRatio="none" aria-hidden="true"><path class="pencil-strike-path" d="M 2 9 Q 55 4, 118 9 T 238 7" /><path class="pencil-strike-path-secondary" d="M 6 12 Q 75 14, 150 8 T 234 11" /></svg>}@if (isScribbling()) {<span class="pencil-tip-runner" aria-hidden="true">✏️</span>}</span>

      <div class="item-actions">
        <button
          type="button"
          class="item-action-btn edit-btn"
          (click)="onEdit($event)"
          title="Edit">
          ✏️
        </button>
        <button
          type="button"
          class="item-action-btn delete-btn"
          (click)="onDelete($event)"
          title="Delete">
          🗑
        </button>
      </div>

      @for (bit of confettiBits(); track bit.id) {
        <span
          class="paper-confetti-bit"
          [style.background]="bit.color"
          [style.left]="bit.left"
          [style.--tx]="bit.tx"
          [style.--ty]="bit.ty"
          [style.--rot]="bit.rot"
          style="top: 50%;">
        </span>
      }
    </div>
  `
})
export class ItemCardComponent {
  readonly scheduleState = inject(ScheduleStateService);
  readonly timer = inject(TimerService);
  readonly audio = inject(AudioService);
  readonly uiModal = inject(UiModalService);

  @Input({ required: true }) item!: MeetingItem | TaskItem;
  @Input({ required: true }) type!: ScheduleItemType;

  readonly isScribbling = signal(false);
  readonly confettiBits = signal<ConfettiBit[]>([]);

  readonly isActive = computed(() => {
    return this.scheduleState.activeItemId() === this.item.id;
  });

  readonly displayText = computed(() => {
    let text = this.item.text;
    if (this.type === 'meeting') {
      const time = (this.item as MeetingItem).time;
      if (time && !text.toLowerCase().startsWith(time.toLowerCase())) {
        text = `${time} ${text}`;
      }
    }
    return text;
  });

  readonly dayBadgeText = computed(() => {
    const todayIso = this.scheduleState.toLocalIsoDate(new Date());
    const selectedIso = this.scheduleState.selectedDateIso();
    if (!this.item.date || this.item.date === todayIso || this.item.date === selectedIso) {
      return '';
    }
    return this.scheduleState.formatShortMonthDay(this.item.date);
  });

  onCardClick(): void {
    if (this.isScribbling()) return;

    if (this.item.completed) {
      this.audio.playSoftPopSound();
      this.scheduleState.setItemCompleted(this.item.id, this.type, false);
      return;
    }

    if (!this.isActive()) {
      this.audio.playSoftPopSound();
      this.timer.selectItem(this.item.id, this.type);
      return;
    }

    this.triggerPencilCompletion();
  }

  triggerPencilCompletion(): void {
    this.timer.pauseTimer();
    this.audio.playPencilScratchSound();
    this.uiModal.triggerCompanionCelebration();
    this.isScribbling.set(true);
    this.spawnPaperConfetti();

    setTimeout(() => {
      this.isScribbling.set(false);
      this.scheduleState.setItemCompleted(this.item.id, this.type, true);
    }, 390);
  }

  onEdit(event: MouseEvent): void {
    event.stopPropagation();
    this.uiModal.openEditModal(this.item, this.type);
  }

  onContextMenu(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.uiModal.openEditModal(this.item, this.type);
  }

  onDelete(event: MouseEvent): void {
    event.stopPropagation();
    this.scheduleState.deleteItem(this.item.id, this.type);
  }

  private spawnPaperConfetti(): void {
    const colors = ['#ffb7c5', '#fde047', '#86efac', '#93c5fd', '#c4b5fd'];
    const bits: ConfettiBit[] = Array.from({ length: 9 }, (_, idx) => {
      const tx = `${Math.round((Math.random() - 0.35) * 85)}px`;
      const ty = `${Math.round(-12 - Math.random() * 32)}px`;
      const rot = `${Math.round((Math.random() - 0.5) * 260)}deg`;
      const left = `${18 + idx * 8}%`;
      return {
        id: idx,
        color: colors[idx % colors.length],
        tx,
        ty,
        rot,
        left
      };
    });
    this.confettiBits.set(bits);
    setTimeout(() => {
      this.confettiBits.set([]);
    }, 560);
  }
}
