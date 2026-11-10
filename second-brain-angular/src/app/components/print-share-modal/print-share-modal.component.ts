import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MeetingItem, TaskItem } from '../../models';
import { ScheduleStateService, UiModalService } from '../../services';

interface PlannerDayBlock {
  iso: string;
  dayHeading: string;
  meetings: MeetingItem[];
  tasks: TaskItem[];
}

@Component({
  selector: 'app-print-share-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="modal-overlay"
      [class.open]="uiModal.printModalOpen()"
      [class.print-modal-open]="uiModal.printModalOpen()"
      (click)="onOverlayClick($event)">
      <div class="modal-card receipt-modal-card">
        <div class="modal-header">
          <h3>🖨️ Print & Share Schedule</h3>
          <button
            type="button"
            class="modal-close"
            (click)="uiModal.closePrintModal()">
            &times;
          </button>
        </div>

        <!-- Period & Filter Configuration -->
        <div class="print-config-rows">
          <div class="receipt-filter-tabs">
            <button
              type="button"
              class="receipt-tab"
              [class.active]="uiModal.printPeriod() === 'today'"
              (click)="uiModal.setPrintPeriod('today')">
              📅 For Today
            </button>
            <button
              type="button"
              class="receipt-tab"
              [class.active]="uiModal.printPeriod() === 'week'"
              (click)="uiModal.setPrintPeriod('week')">
              🗓️ Upcoming Week (7 Days)
            </button>
          </div>

          <div class="receipt-filter-tabs">
            <button
              type="button"
              class="receipt-tab"
              [class.active]="uiModal.printFilter() === 'all'"
              (click)="uiModal.setPrintFilter('all')">
              All Together
            </button>
            <button
              type="button"
              class="receipt-tab"
              [class.active]="uiModal.printFilter() === 'tasks'"
              (click)="uiModal.setPrintFilter('tasks')">
              Only Tasks
            </button>
            <button
              type="button"
              class="receipt-tab"
              [class.active]="uiModal.printFilter() === 'meetings'"
              (click)="uiModal.setPrintFilter('meetings')">
              Only Meetings
            </button>
          </div>
        </div>

        <!-- Clean Printable Planner Sheet Preview -->
        <div class="planner-preview-wrapper">
          <div class="planner-sheet">
            <div class="planner-sheet-header">
              <div>
                <div class="planner-sheet-title">{{ sheetTitle() }}</div>
                <div class="planner-sheet-subtitle">{{ sheetSubtitle() }}</div>
              </div>
              <span class="planner-sheet-badge">Second Brain</span>
            </div>

            <div class="planner-sheet-body">
              @if (dayBlocks().length === 0) {
                <div class="planner-empty-msg">
                  No scheduled items for the selected period ✨
                </div>
              } @else {
                @for (block of dayBlocks(); track block.iso) {
                  <div class="planner-day-block">
                    @if (uiModal.printPeriod() === 'week') {
                      <div class="planner-day-heading">{{ block.dayHeading }}</div>
                    }

                    @if (block.meetings.length > 0) {
                      <div class="planner-section-block">
                        <div class="planner-section-title">📅 Meetings</div>
                        @for (m of block.meetings; track m.id) {
                          <div class="planner-row" [class.is-done]="m.completed">
                            <span class="planner-item-name">
                              {{ m.completed ? '☑' : '☐' }} {{ m.text }}
                            </span>
                            <span class="planner-item-time">{{ m.time }}</span>
                          </div>
                        }
                      </div>
                    }

                    @if (block.tasks.length > 0) {
                      <div class="planner-section-block">
                        <div class="planner-section-title">📝 Tasks</div>
                        @for (t of block.tasks; track t.id) {
                          <div class="planner-row" [class.is-done]="t.completed">
                            <span class="planner-item-name">
                              {{ t.completed ? '☑' : '☐' }} {{ t.text }}
                            </span>
                            <span class="planner-item-time">{{ t.durationMinutes || 25 }} min</span>
                          </div>
                        }
                      </div>
                    }
                  </div>
                }
              }
            </div>
          </div>
        </div>

        <!-- Action Buttons: Print, Copy, Native Share, Messenger Links -->
        <div class="receipt-actions-bar">
          <div class="receipt-primary-actions">
            <button
              type="button"
              class="timer-btn primary-btn"
              (click)="onPrint()">
              🖨️ Print / Save PDF
            </button>
            <button
              type="button"
              class="timer-btn secondary-btn"
              (click)="onCopyText()">
              {{ copyBtnLabel() }}
            </button>
            <button
              type="button"
              class="timer-btn complete-btn"
              (click)="onNativeShare()">
              📤 Share...
            </button>
          </div>
          <div class="receipt-messenger-links">
            <a
              [href]="telegramShareUrl()"
              target="_blank"
              rel="noopener"
              class="messenger-pill">
              ✈️ Telegram
            </a>
            <a
              [href]="whatsappShareUrl()"
              target="_blank"
              rel="noopener"
              class="messenger-pill">
              💬 WhatsApp
            </a>
            <a
              [href]="viberShareUrl()"
              target="_blank"
              rel="noopener"
              class="messenger-pill">
              💜 Viber
            </a>
            <a
              [href]="emailShareUrl()"
              class="messenger-pill">
              ✉️ Email
            </a>
          </div>
        </div>
      </div>
    </div>
  `
})
export class PrintShareModalComponent {
  readonly uiModal = inject(UiModalService);
  readonly scheduleState = inject(ScheduleStateService);

  readonly copyBtnLabel = signal('📋 Copy Text');

  readonly dateListIso = computed<string[]>(() => {
    const startIso = this.scheduleState.selectedDateIso();
    const startDate = this.scheduleState.parseIsoDateLocal(startIso);
    const daysCount = this.uiModal.printPeriod() === 'week' ? 7 : 1;
    const list: string[] = [];

    for (let i = 0; i < daysCount; i++) {
      const d = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate() + i
      );
      list.push(this.scheduleState.toLocalIsoDate(d));
    }
    return list;
  });

  readonly sheetTitle = computed(() =>
    this.uiModal.printPeriod() === 'week' ? 'Weekly Schedule Plan' : 'Daily Schedule Plan'
  );

  readonly sheetSubtitle = computed(() => {
    const dates = this.dateListIso();
    const first = this.scheduleState.parseIsoDateLocal(dates[0]);
    if (this.uiModal.printPeriod() === 'today' || dates.length === 1) {
      return first.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
    const last = this.scheduleState.parseIsoDateLocal(dates[dates.length - 1]);
    const startLabel = first.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endLabel = last.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    return `${startLabel} – ${endLabel}`;
  });

  readonly dayBlocks = computed<PlannerDayBlock[]>(() => {
    const filter = this.uiModal.printFilter();
    const period = this.uiModal.printPeriod();
    const allMeetings = this.scheduleState.meetings();
    const allTasks = this.scheduleState.tasks();
    const blocks: PlannerDayBlock[] = [];

    for (const iso of this.dateListIso()) {
      const meetings =
        filter === 'all' || filter === 'meetings'
          ? allMeetings.filter(m => m.date === iso)
          : [];
      const tasks =
        filter === 'all' || filter === 'tasks'
          ? allTasks.filter(t => t.date === iso)
          : [];

      if (period === 'week' && meetings.length === 0 && tasks.length === 0) {
        continue;
      }

      const d = this.scheduleState.parseIsoDateLocal(iso);
      const dayHeading = d.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
      });

      if (meetings.length > 0 || tasks.length > 0) {
        blocks.push({ iso, dayHeading, meetings, tasks });
      }
    }

    return blocks;
  });

  readonly plainTextSchedule = computed<string>(() => {
    const lines: string[] = [];
    lines.push(`📋 ${this.sheetTitle()} (${this.sheetSubtitle()})`);
    lines.push('');

    const blocks = this.dayBlocks();
    if (blocks.length === 0) {
      lines.push('No scheduled items for this period ✨');
      return lines.join('\n');
    }

    for (const block of blocks) {
      if (this.uiModal.printPeriod() === 'week') {
        lines.push(`🗓️ ${block.dayHeading}`);
      }
      if (block.meetings.length > 0) {
        lines.push('📅 Meetings:');
        block.meetings.forEach(m => {
          lines.push(`  ${m.completed ? '✅' : '⬜'} ${m.text} (${m.time})`);
        });
      }
      if (block.tasks.length > 0) {
        lines.push('📝 Tasks:');
        block.tasks.forEach(t => {
          lines.push(`  ${t.completed ? '✅' : '⬜'} ${t.text} (${t.durationMinutes || 25} min)`);
        });
      }
      lines.push('');
    }

    return lines.join('\n').trim();
  });

  readonly encodedShareText = computed(() => encodeURIComponent(this.plainTextSchedule()));

  readonly telegramShareUrl = computed(
    () => `https://t.me/share/url?url=%20&text=${this.encodedShareText()}`
  );

  readonly whatsappShareUrl = computed(
    () => `https://wa.me/?text=${this.encodedShareText()}`
  );

  readonly viberShareUrl = computed(
    () => `viber://forward?text=${this.encodedShareText()}`
  );

  readonly emailShareUrl = computed(() => {
    const subject = encodeURIComponent('Second Brain Schedule');
    return `mailto:?subject=${subject}&body=${this.encodedShareText()}`;
  });

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.uiModal.closePrintModal();
    }
  }

  onPrint(): void {
    window.print();
  }

  async onCopyText(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.plainTextSchedule());
      this.copyBtnLabel.set('✅ Copied!');
      setTimeout(() => {
        this.copyBtnLabel.set('📋 Copy Text');
      }, 1800);
    } catch {
      // Fallback ignored if clipboard unavailable
    }
  }

  async onNativeShare(): Promise<void> {
    const text = this.plainTextSchedule();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Second Brain Schedule',
          text
        });
        return;
      } catch {
        // User cancelled or share failed
      }
    }
    await this.onCopyText();
  }
}
