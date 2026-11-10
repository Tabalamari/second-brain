import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MeetingItem, TaskItem } from '../../models';
import { ScheduleStateService, UiModalService } from '../../services';

interface PlannerDayBlock {
  iso: string;
  dayHeading: string;
  isToday: boolean;
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
      id="receipt-modal"
      [class.open]="uiModal.printModalOpen()"
      [class.print-modal-open]="uiModal.printModalOpen()"
      (click)="onOverlayClick($event)">
      <div class="modal-card receipt-modal-card">
        <div class="modal-header">
        <div class="modal-header no-print">
          <h3>🖨️ Print & Share Schedule</h3>
          <button
            type="button"
            class="modal-close"
            id="receipt-close-btn"
            (click)="uiModal.closePrintModal()">
            &times;
          </button>
        </div>

        <!-- Period & Filter Configuration -->
        <div class="print-config-rows">
          <div class="receipt-filter-tabs">
        <div class="planner-controls-group no-print">
          <div class="receipt-period-bar" role="tablist" aria-label="Schedule period">
            <button
              type="button"
              class="receipt-tab"
              class="receipt-period-btn"
              [class.active]="uiModal.printPeriod() === 'today'"
              (click)="uiModal.setPrintPeriod('today')">
              📅 For Today
            </button>
            <button
              type="button"
              class="receipt-tab"
              class="receipt-period-btn"
              [class.active]="uiModal.printPeriod() === 'week'"
              (click)="uiModal.setPrintPeriod('week')">
              🗓️ Upcoming Week (7 Days)
            </button>
          </div>

          <div class="receipt-filter-tabs">
          <div class="receipt-filter-bar" role="tablist" aria-label="Schedule content filter">
            <button
              type="button"
              class="receipt-tab"
              class="receipt-filter-btn"
              [class.active]="uiModal.printFilter() === 'all'"
              (click)="uiModal.setPrintFilter('all')">
              All Together
            </button>
            <button
              type="button"
              class="receipt-tab"
              class="receipt-filter-btn"
              [class.active]="uiModal.printFilter() === 'tasks'"
              (click)="uiModal.setPrintFilter('tasks')">
              Only Tasks
            </button>
            <button
              type="button"
              class="receipt-tab"
              class="receipt-filter-btn"
              [class.active]="uiModal.printFilter() === 'meetings'"
              (click)="uiModal.setPrintFilter('meetings')">
              Only Meetings
            </button>
          </div>
        </div>

        <!-- Clean Printable Planner Sheet Preview -->
        <div class="planner-preview-wrapper">
          <div class="planner-sheet">
        <!-- Printable Planner Sheet -->
        <div class="planner-sheet-wrapper" id="printable-receipt-area">
          <div class="planner-sheet" id="daily-receipt-card">
            <div class="planner-sheet-header">
              <div>
                <div class="planner-sheet-title">{{ sheetTitle() }}</div>
                <div class="planner-sheet-subtitle">{{ sheetSubtitle() }}</div>
              <div class="planner-sheet-title-row">
                <span class="planner-sheet-brand">Second Brain — Schedule</span>
                <span class="planner-sheet-badge" id="receipt-period-badge">
                  {{ periodBadgeLabel() }}
                </span>
              </div>
              <span class="planner-sheet-badge">Second Brain</span>
              <div class="planner-sheet-date" id="receipt-date-stamp">
                {{ dateStampLabel() }}
              </div>
            </div>

            <div class="planner-sheet-body">
            <div class="planner-sheet-body" id="receipt-items-body">
              @if (dayBlocks().length === 0) {
                <div class="planner-empty-msg">
                <div class="planner-empty-line">
                  No scheduled items for the selected period ✨
                </div>
              } @else {
                @for (block of dayBlocks(); track block.iso) {
                  <div class="planner-day-block">
                  <div class="planner-day-block" [class.is-today]="block.isToday">
                    @if (uiModal.printPeriod() === 'week') {
                      <div class="planner-day-heading">{{ block.dayHeading }}</div>
                      <div class="planner-day-header">
                        <span>{{ block.dayHeading }}</span>
                        <span>{{ block.meetings.length + block.tasks.length }} items</span>
                      </div>
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
                      <div class="planner-section-title">📅 Meetings</div>
                      @for (m of block.meetings; track m.id) {
                        <div class="planner-line-item" [class.is-done]="m.completed">
                          <span class="planner-item-name">
                            {{ m.completed ? '☑' : '☐' }} {{ m.text }}
                          </span>
                          <span class="planner-item-meta">{{ m.time || 'Scheduled' }}</span>
                        </div>
                      }
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
                      <div class="planner-section-title">✅ Tasks</div>
                      @for (t of block.tasks; track t.id) {
                        <div class="planner-line-item" [class.is-done]="t.completed">
                          <span class="planner-item-name">
                            {{ t.completed ? '☑' : '☐' }} {{ t.text }}
                          </span>
                          <span class="planner-item-meta">{{ t.durationMinutes || 25 }} min</span>
                        </div>
                      }
                    }
                  </div>
                }
              }
            </div>

            <div class="planner-sheet-summary" id="receipt-totals-box">
              <span>Total items: {{ totalItemsCount() }}</span>
              <span>Est. Focus Time: {{ totalFocusMinutes() }} min</span>
            </div>
          </div>
        </div>

        <!-- Action Buttons: Print, Copy, Native Share, Messenger Links -->
        <div class="receipt-actions-bar">
        <div class="receipt-actions-panel no-print">
          <div class="receipt-primary-actions">
            <button
              type="button"
              class="timer-btn primary-btn"
              id="receipt-print-btn"
              (click)="onPrint()">
              🖨️ Print / Save PDF
            </button>
            <button
              type="button"
              class="timer-btn secondary-btn"
              id="receipt-copy-btn"
              (click)="onCopyText()">
              {{ copyBtnLabel() }}
            </button>
            <button
              type="button"
              class="timer-btn complete-btn"
              id="receipt-native-share-btn"
              (click)="onNativeShare()">
              📤 Share...
            </button>
          </div>
          <div class="receipt-messenger-links">
          <div class="receipt-messenger-row">
            <span class="share-row-label">Send to:</span>
            <a
              [href]="telegramShareUrl()"
              target="_blank"
              rel="noopener"
              class="messenger-pill">
              class="messenger-pill"
              title="Share via Telegram">
              ✈️ Telegram
            </a>
            <a
              [href]="whatsappShareUrl()"
              target="_blank"
              rel="noopener"
              class="messenger-pill">
              class="messenger-pill"
              title="Share via WhatsApp">
              💬 WhatsApp
            </a>
            <a
              [href]="viberShareUrl()"
              target="_blank"
              rel="noopener"
              class="messenger-pill">
              class="messenger-pill"
              title="Share via Viber">
              💜 Viber
            </a>
            <a
              [href]="emailShareUrl()"
              class="messenger-pill">
              class="messenger-pill"
              title="Send via Email">
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
  readonly periodBadgeLabel = computed(() =>
      this.uiModal.printPeriod() === 'week' ? 'Weekly Plan (7 Days)' : 'Daily Plan'
    );

  readonly sheetSubtitle = computed(() => {
  readonly dateStampLabel = computed(() => {
    const dates = this.dateListIso();
    const first = this.scheduleState.parseIsoDateLocal(dates[0]);
    const formatDot = (d: Date) =>
      `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
    if (this.uiModal.printPeriod() === 'today' || dates.length === 1) {
      return first.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      return `Date: ${formatDot(first)}`;
    }
    const last = this.scheduleState.parseIsoDateLocal(dates[dates.length - 1]);
    const startLabel = first.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endLabel = last.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    return `${startLabel} – ${endLabel}`;
    return `Period: ${formatDot(first)} – ${formatDot(last)}`;
  });

  readonly dayBlocks = computed<PlannerDayBlock[]>(() => {
    const filter = this.uiModal.printFilter();
    const period = this.uiModal.printPeriod();
    const todayIso = this.scheduleState.toLocalIsoDate(new Date());
    const allMeetings = this.scheduleState.meetings();
    const allTasks = this.scheduleState.tasks();
    const blocks: PlannerDayBlock[] = [];

    for (const iso of this.dateListIso()) {
      const meetings =
        filter === 'all' || filter === 'meetings'
          ? allMeetings.filter(m => m.date === iso)
            ? allMeetings.filter(m => (m.date || todayIso) === iso)
            : [];
      const tasks =
        filter === 'all' || filter === 'tasks'
          ? allTasks.filter(t => t.date === iso)
            ? allTasks.filter(t => (t.date || todayIso) === iso)
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
        blocks.push({
          iso,
          dayHeading,
          isToday: iso === todayIso,
          meetings,
          tasks
        });
      }
    }

    return blocks;
  });

  readonly totalItemsCount = computed(() =>
    this.dayBlocks().reduce(
      (sum, b) => sum + b.meetings.length + b.tasks.length,
      0
    )
  );

  readonly totalFocusMinutes = computed(() =>
    this.dayBlocks().reduce(
      (sum, b) =>
        sum +
        b.meetings.length * 25 +
        b.tasks.reduce((tSum, t) => tSum + (t.durationMinutes || 25), 0),
      0
    )
  );

  readonly plainTextSchedule = computed<string>(() => {
    const lines: string[] = [];
    lines.push(`📋 ${this.sheetTitle()} (${this.sheetSubtitle()})`);
    lines.push(`📋 Second Brain — ${this.periodBadgeLabel()} (${this.dateStampLabel()})`);
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
          lines.push(`  ${m.completed ? '☑' : '☐'} ${m.text}`);
        });
      }
      if (block.tasks.length > 0) {
        lines.push('📝 Tasks:');
        lines.push('✅ Tasks:');
        block.tasks.forEach(t => {
          lines.push(`  ${t.completed ? '✅' : '⬜'} ${t.text} (${t.durationMinutes || 25} min)`);
          lines.push(`  ${t.completed ? '☑' : '☐'} ${t.text} (${t.durationMinutes || 25} min)`);
        });
      }
      lines.push('');
    }

    lines.push(`Total items: ${this.totalItemsCount()} | Est. Focus Time: ${this.totalFocusMinutes()} min`);
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
      // Ignore if clipboard unavailable
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
