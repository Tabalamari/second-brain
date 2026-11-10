import { Injectable, signal } from '@angular/core';
import { MeetingItem, ScheduleItemType, TaskItem } from '../models';

export type PrintFilterType = 'all' | 'tasks' | 'meetings';
export type PrintPeriodType = 'today' | 'week';

export interface ItemModalConfig {
  isOpen: boolean;
  type: ScheduleItemType;
  editItem?: MeetingItem | TaskItem | null;
  defaultDateIso?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UiModalService {
  readonly itemModal = signal<ItemModalConfig>({
    isOpen: false,
    type: 'task',
    editItem: null
  });

  readonly printModalOpen = signal<boolean>(false);
  readonly printFilter = signal<PrintFilterType>('all');
  readonly printPeriod = signal<PrintPeriodType>('today');
  readonly isCompanionCelebrating = signal<boolean>(false);

  private celebrateTimeout: ReturnType<typeof setTimeout> | null = null;

  openAddModal(type: ScheduleItemType, defaultDateIso?: string): void {
    this.itemModal.set({
      isOpen: true,
      type,
      editItem: null,
      defaultDateIso
    });
  }

  openEditModal(
    item: MeetingItem | TaskItem,
    type: ScheduleItemType
  ): void {
    this.itemModal.set({
      isOpen: true,
      type,
      editItem: item,
      defaultDateIso: item.date
    });
  }

  closeItemModal(): void {
    this.itemModal.update(curr => ({ ...curr, isOpen: false, editItem: null }));
  }

  openPrintModal(
    filter: PrintFilterType = 'all',
    period: PrintPeriodType = 'today'
  ): void {
    this.printFilter.set(filter);
    this.printPeriod.set(period);
    this.printModalOpen.set(true);
  }

  closePrintModal(): void {
    this.printModalOpen.set(false);
  }

  setPrintFilter(filter: PrintFilterType): void {
    this.printFilter.set(filter);
  }

  setPrintPeriod(period: PrintPeriodType): void {
    this.printPeriod.set(period);
  }

  triggerCompanionCelebration(): void {
    this.isCompanionCelebrating.set(true);
    if (this.celebrateTimeout) {
      clearTimeout(this.celebrateTimeout);
    }
    this.celebrateTimeout = setTimeout(() => {
      this.isCompanionCelebrating.set(false);
    }, 1500);
  }
}
