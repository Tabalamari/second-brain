import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AudioService, ScheduleStateService, TimerService, UiModalService } from '../../services';

@Component({
  selector: 'app-timer-widget',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="column-card timer-card">
      <div class="column-header timer-header">
        <h2>Timer</h2>
        <div class="timer-header-controls">
          <button
            type="button"
            class="ambient-sound-btn"
            [class.active]="audio.ambientMode() !== 'off'"
            (click)="audio.cycleAmbientSound()"
            title="Toggle Ambient Focus Sound (Off / Rain / Brown Noise / Vinyl)">
            {{ ambientButtonLabel() }}
          </button>
          <span
            class="status-badge"
            [class.active]="timer.isRunning()"
            [class.inactive]="!timer.isRunning()">
            {{ timer.statusBadgeText() }}
          </span>
        </div>
      </div>

      <div class="timer-body">
        <!-- Active Task / Meeting Title -->
        <div class="timer-active-title">
          {{ timer.activeItemTitle() }}
        </div>

        <!-- Focus Companion + Analog SVG Clock Timer -->
        <div class="analog-timer-wrapper">
          <div
            class="focus-companion"
            [attr.data-companion]="scheduleState.companionType()"
            [attr.data-status]="timer.isRunning() ? 'active' : 'inactive'"
            [class.celebrating]="uiModal.isCompanionCelebrating()"
            (click)="scheduleState.toggleCompanionType()"
            title="Click to switch companion (Cat 🐱 / Plant 🌱)">
            <svg class="companion-svg" viewBox="0 0 80 60">
              <!-- Cat Companion -->
              @if (scheduleState.companionType() === 'cat') {
                <g class="companion-body-group">
                  <!-- Ears -->
                  <polygon points="18,32 14,12 30,22" fill="#ffffff" stroke="#1e293b" stroke-width="2.5" stroke-linejoin="round"/>
                  <polygon points="17,27 16,16 26,22" fill="#ff8fab"/>
                  <polygon points="62,32 66,12 50,22" fill="#ffffff" stroke="#1e293b" stroke-width="2.5" stroke-linejoin="round"/>
                  <polygon points="63,27 64,16 54,22" fill="#ff8fab"/>
                  <!-- Head -->
                  <ellipse cx="40" cy="36" rx="24" ry="18" fill="#ffffff" stroke="#1e293b" stroke-width="2.5"/>
                  <!-- Cheeks -->
                  <ellipse cx="23" cy="39" rx="4" ry="2.2" fill="#ff8fab" opacity="0.7"/>
                  <ellipse cx="57" cy="39" rx="4" ry="2.2" fill="#ff8fab" opacity="0.7"/>
                  <!-- Eyes (Awake when running) -->
                  @if (timer.isRunning()) {
                    <g>
                      <circle cx="31" cy="34" r="3.2" fill="#1e293b"/>
                      <circle cx="49" cy="34" r="3.2" fill="#1e293b"/>
                      <circle
                        cx="32"
                        cy="33"
                        r="1.1"
                        fill="#ffffff"
                        [attr.transform]="catPupilTransform()" />
                      <circle
                        cx="50"
                        cy="33"
                        r="1.1"
                        fill="#ffffff"
                        [attr.transform]="catPupilTransform()" />
                    </g>
                  } @else {
                    <!-- Sleeping Eyes (When inactive) -->
                    <g>
                      <path d="M 27 34 Q 31 38 35 34" fill="none" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round"/>
                      <path d="M 45 34 Q 49 38 53 34" fill="none" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round"/>
                    </g>
                  }
                  <!-- Nose & Mouth -->
                  <path d="M 36 39 Q 40 42 44 39" fill="none" stroke="#1e293b" stroke-width="2" stroke-linecap="round"/>
                  <!-- Paws resting on timer rim -->
                  <ellipse cx="28" cy="53" rx="6" ry="4" fill="#ffffff" stroke="#1e293b" stroke-width="2.2"/>
                  <ellipse cx="52" cy="53" rx="6" ry="4" fill="#ffffff" stroke="#1e293b" stroke-width="2.2"/>
                </g>
              } @else {
                <!-- Plant Sprout Companion -->
                <g class="companion-body-group">
                  <!-- Pot rim -->
                  <rect x="26" y="44" width="28" height="10" rx="3" fill="#ff8fab" stroke="#1e293b" stroke-width="2.3"/>
                  <!-- Stem & Leaves -->
                  <g [attr.transform]="plantStemTransform()">
                    <path d="M 40 44 Q 40 28 40 20" fill="none" stroke="#166534" stroke-width="3" stroke-linecap="round"/>
                    <path d="M 40 30 Q 26 22 24 30 Q 30 36 40 32" fill="#86efac" stroke="#1e293b" stroke-width="2" stroke-linejoin="round"/>
                    <path d="M 40 26 Q 54 18 56 26 Q 50 32 40 28" fill="#4ade80" stroke="#1e293b" stroke-width="2" stroke-linejoin="round"/>
                    @if (plantBloomVisible()) {
                      <circle cx="40" cy="17" r="5" fill="#ffd166" stroke="#1e293b" stroke-width="2"/>
                    }
                  </g>
                </g>
              }

              <!-- Floating Zzz when inactive -->
              <g class="companion-zzz">
                <text x="62" y="18" font-family="Shantell Sans, cursive" font-size="11" font-weight="700" fill="#1e293b">z</text>
                <text x="69" y="10" font-family="Shantell Sans, cursive" font-size="14" font-weight="700" fill="#e65c84">Z</text>
              </g>

              <!-- Celebration sparkles -->
              <g class="companion-sparkles">
                <text x="4" y="20" font-size="14">✨</text>
                <text x="64" y="20" font-size="14">🎉</text>
              </g>
            </svg>
          </div>

          <div class="analog-timer-container">
            <svg class="timer-svg" viewBox="0 0 220 220">
              <!-- Outer Border Circle -->
              <circle cx="110" cy="110" r="95" class="clock-outer-ring" />

              <!-- Elapsed / Remaining Pink Pie Sector using stroke-dasharray -->
              <circle
                cx="110"
                cy="110"
                r="47.5"
                class="clock-sector-ring"
                [style.strokeDasharray]="timer.RING_CIRCUMFERENCE"
                [style.strokeDashoffset]="timer.strokeDashoffset()" />

              <!-- Clock Ticks (12 hours / 5-min marks) -->
              <g class="clock-ticks">
                <line x1="110" y1="20" x2="110" y2="30" />
                <line x1="155" y1="32" x2="150" y2="40.6" />
                <line x1="187.9" y1="65" x2="179.3" y2="70" />
                <line x1="200" y1="110" x2="190" y2="110" />
                <line x1="187.9" y1="155" x2="179.3" y2="150" />
                <line x1="155" y1="187.9" x2="150" y2="179.3" />
                <line x1="110" y1="200" x2="110" y2="190" />
                <line x1="65" y1="187.9" x2="70" y2="179.3" />
                <line x1="32" y1="155" x2="40.6" y2="150" />
                <line x1="20" y1="110" x2="30" y2="110" />
                <line x1="32" y1="65" x2="40.6" y2="70" />
                <line x1="65" y1="32" x2="70" y2="40.6" />
              </g>

              <!-- Clock Rotating Hand -->
              <line
                x1="110"
                y1="110"
                x2="110"
                y2="38"
                class="clock-hand"
                [attr.transform]="'rotate(' + timer.handRotationDegrees() + ' 110 110)'" />

              <!-- Center Pivot Dot -->
              <circle cx="110" cy="110" r="6" class="clock-center-dot" />
            </svg>
          </div>
        </div>

        <!-- Digital Countdown Display -->
        <div class="digital-display">
          <div class="digital-time">{{ timer.timeDisplayText() }}</div>
          <div class="digital-sublabel">{{ timer.sublabelDisplayText() }}</div>
        </div>

        <!-- Timer Controls -->
        <div class="timer-controls">
          <button
            type="button"
            class="timer-btn primary-btn"
            (click)="timer.toggleStartPause()">
            {{ timer.isRunning() ? 'Pause' : 'Start' }}
          </button>
          <button
            type="button"
            class="timer-btn secondary-btn"
            (click)="timer.resetTimer()">
            Reset
          </button>
          <button
            type="button"
            class="timer-btn complete-btn"
            (click)="onCompleteActiveItem()"
            title="Mark selected item completed">
            Complete
          </button>
        </div>

        <!-- Quick Duration Presets -->
        <div class="timer-presets">
          @for (min of presets; track min) {
            <button
              type="button"
              class="preset-btn"
              [class.active]="activePreset() === min"
              (click)="onSelectPreset(min)">
              {{ min }}min
            </button>
          }
        </div>
      </div>
    </section>
  `
})
export class TimerWidgetComponent {
  readonly timer = inject(TimerService);
  readonly scheduleState = inject(ScheduleStateService);
  readonly audio = inject(AudioService);
  readonly uiModal = inject(UiModalService);

  readonly presets = [5, 15, 25, 30, 60];
  readonly activePreset = signal<number | null>(25);

  readonly ambientButtonLabel = computed(() => {
    const mode = this.audio.ambientMode();
    switch (mode) {
      case 'rain':
        return '🌧️ Rain';
      case 'brown':
        return '🌊 Focus';
      case 'vinyl':
        return '📻 Vinyl';
      default:
        return '🎧 Sound';
    }
  });

  readonly catPupilTransform = computed(() => {
    const angleRad = ((this.timer.handRotationDegrees() - 90) * Math.PI) / 180;
    const lookX = (Math.cos(angleRad) * 1.4).toFixed(2);
    const lookY = (Math.sin(angleRad) * 1.4).toFixed(2);
    return `translate(${lookX}, ${lookY})`;
  });

  readonly plantStemTransform = computed(() => {
    const total = this.timer.totalSeconds();
    const rem = this.timer.remainingSeconds();
    const progress = total > 0 ? Math.max(0, Math.min(1, 1 - rem / total)) : 0;
    const scale = (0.75 + progress * 0.4).toFixed(2);
    return `translate(40, 44) scale(${scale}) translate(-40, -44)`;
  });

  readonly plantBloomVisible = computed(() => {
    const total = this.timer.totalSeconds();
    const rem = this.timer.remainingSeconds();
    const progress = total > 0 ? 1 - rem / total : 0;
    return progress > 0.5 || this.uiModal.isCompanionCelebrating();
  });

  onSelectPreset(minutes: number): void {
    this.activePreset.set(minutes);
    this.timer.applyPresetMinutes(minutes);
  }

  onCompleteActiveItem(): void {
    const active = this.scheduleState.activeItem();
    if (!active) return;
    this.audio.playPencilScratchSound();
    this.uiModal.triggerCompanionCelebration();
    this.timer.completeActiveItem();
  }
}
