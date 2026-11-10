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
}

@Component({
  selector: 'app-item-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="item-card"
      [class.completed-item]="item.completed"
      [class.active-item]="isActive()"
      [class.just-completed]="justCompleted()"
      (click)="onCardClick()"
      (contextmenu)="onContextMenu($event)">
      <div class="item-left">
        <div
          class="custom-checkbox"
          (click)="onToggleComplete($event)"
          title="Mark complete">
        </div>
        <div class="item-title-wrap">
          <span class="item-title">{{ item.text }}</span>
          @if (dayBadgeText()) {
            <span class="item-day-badge">📅 {{ dayBadgeText() }}</span>
          }
          @if (item.completed) {
            <svg class="pencil-strike-svg" viewBox="0 0 200 16" preserveAspectRatio="none">
              <path
                class="pencil-strike-path"
                d="M 2 9 Q 35 4, 70 9 T 140 8 T 198 7 M 5 11 Q 60 13, 125 7 T 196 10" />
            </svg>
          }
          @if (justCompleted()) {
            <span class="pencil-tip-runner">✏️</span>
          }
        </div>
      </div>

      <div class="item-right">
        <span class="item-meta">{{ itemMetaText() }}</span>
        <button
          type="button"
          class="item-edit"
          (click)="onEdit($event)"
          title="Edit">
          ✏️
        </button>
        <button
          type="button"
          class="item-delete"
          (click)="onDelete($event)"
          title="Delete">
          🗑
        </button>
      </div>

      @for (bit of confettiBits(); track bit.id) {
        <span
          class="paper-confetti-bit"
          [style.background]="bit.color"
          [style.--tx]="bit.tx"
          [style.--ty]="bit.ty"
          [style.--rot]="bit.rot"
          style="left: 24px; top: 50%;">
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

  readonly justCompleted = signal(false);
  readonly confettiBits = signal<ConfettiBit[]>([]);

  readonly isActive = computed(() => {
    const active = this.scheduleState.activeItem();
    return Boolean(
      active &&
        !this.item.completed &&
        active.id === this.item.id &&
        active.type === this.type
    );
  });

  readonly itemMetaText = computed(() => {
    if (this.type === 'meeting') {
      return (this.item as MeetingItem).time || '';
    }
    const mins = (this.item as TaskItem).durationMinutes;
    return mins ? `${mins}min` : '';
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
    if (!this.item.completed) {
      this.timer.selectItem(this.item.id, this.type);
    }
  }

  onToggleComplete(event: MouseEvent): void {
    event.stopPropagation();
    const wasCompleted = this.item.completed;

    if (!wasCompleted) {
      this.audio.playPencilScratchSound();
      this.uiModal.triggerCompanionCelebration();
      this.justCompleted.set(true);
      this.spawnPaperConfetti();
      setTimeout(() => {
        this.justCompleted.set(false);
      }, 650);
    }

    this.scheduleState.toggleComplete(this.item.id, this.type);
  }

  onEdit(event: MouseEvent): void {
    event.stopPropagation();
    this.uiModal.openEditModal(this.item, this.type);
  }

  onContextMenu(event: MouseEvent): void {
    event.preventDefault();
    this.uiModal.openEditModal(this.item, this.type);
  }

  onDelete(event: MouseEvent): void {
    event.stopPropagation();
    this.scheduleState.deleteItem(this.item.id, this.type);
  }

  private spawnPaperConfetti(): void {
    const colors = ['#ff8fab', '#90e0ef', '#ffd166', '#c8b6ff', '#a8e6cf'];
    const bits: ConfettiBit[] = Array.from({ length: 10 }, (_, idx) => {
      const angle = (Math.PI * 2 * idx) / 10 + (Math.random() * 0.4 - 0.2);
      const dist = 26 + Math.random() * 34;
      const tx = `${Math.round(Math.cos(angle) * dist)}px`;
      const ty = `${Math.round(Math.sin(angle) * dist - 10)}px`;
      const rot = `${Math.round(Math.random() * 260 - 130)}deg`;
      return {
        id: idx,
        color: colors[idx % colors.length],
        tx,
        ty,
        rot
      };
    });
    this.confettiBits.set(bits);
    setTimeout(() => {
      this.confettiBits.set([]);
    }, 750);
  }
}
