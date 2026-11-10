import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AudioService, ScheduleStateService, TimerService, UiModalService } from '../../services';

@Component({
  selector: 'app-timer-widget',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section
      class="block-card timer-block"
      id="timer-block"
      [class.has-active]="scheduleState.activeItem() !== null">
      <div class="block-header">
        <h2>Timer:</h2>
        <div class="timer-header-badges">
          <button
            type="button"
            class="ambient-sound-btn"
            [class.is-playing]="audio.ambientMode() !== 'off'"
            (click)="audio.cycleAmbientSound()"
            title="Click to cycle ambient focus sound (Rain / Brown Noise / Vinyl / Off)">
            {{ ambientButtonLabel() }}
          </button>
          <span class="timer-active-indicator" id="timer-status-badge">
            {{ timer.statusBadgeText() }}
          </span>
        </div>
      </div>

      <div class="timer-card-inner" id="timer-card-inner">
        <!-- Active Task / Meeting Title -->
        <div class="active-item-header" id="active-item-title">
          {{ timer.activeItemTitle() }}
        </div>

        <!-- Focus Companion + Analog SVG Clock Timer -->
        <div class="analog-timer-wrapper">
          <div
            class="focus-companion"
            id="focus-companion"
            [attr.data-state]="companionState()"
            [attr.data-companion]="scheduleState.companionType()"
            (click)="scheduleState.toggleCompanionType()"
            title="Click to switch companion (Cat 🐱 / Plant 🌱)">
            <!-- Sleep Zzz bubbles -->
            <div class="companion-zzz" aria-hidden="true">
              <span>z</span><span>Z</span><span>z</span>
            </div>
            <!-- Celebration sparkles -->
            <div class="companion-sparkles" aria-hidden="true">
              <span>✦</span><span>♥</span><span>✦</span>
            </div>

            <!-- Doodle Cat SVG -->
            <svg class="companion-svg companion-cat-svg" viewBox="0 0 120 72" aria-label="Focus Cat Companion">
              <path class="cat-tail" d="M 92 56 Q 112 46 108 28" fill="none" stroke="#2b2d42" stroke-width="4.5" stroke-linecap="round" />
              <path class="cat-body" d="M 32 62 C 28 38, 34 24, 36 12 L 48 24 C 55 21, 65 21, 72 24 L 84 12 C 86 24, 92 38, 88 62 Z" fill="#ffffff" stroke="#2b2d42" stroke-width="3" stroke-linejoin="round" />
              <polygon points="39,18 37,27 45,25" fill="#ffb7c5" />
              <polygon points="81,18 83,27 75,25" fill="#ffb7c5" />
              <ellipse cx="43" cy="46" rx="4.5" ry="2.5" fill="#ffb7c5" />
              <ellipse cx="77" cy="46" rx="4.5" ry="2.5" fill="#ffb7c5" />
              <g class="cat-eyes-sleep">
                <path d="M 44 38 Q 49 43 54 38" fill="none" stroke="#2b2d42" stroke-width="2.5" stroke-linecap="round" />
                <path d="M 66 38 Q 71 43 76 38" fill="none" stroke="#2b2d42" stroke-width="2.5" stroke-linecap="round" />
              </g>
              <g class="cat-eyes-awake">
                <circle cx="49" cy="38" r="5.5" fill="#ffffff" stroke="#2b2d42" stroke-width="2.2" />
                <circle cx="71" cy="38" r="5.5" fill="#ffffff" stroke="#2b2d42" stroke-width="2.2" />
                <g id="cat-pupils" [style.transform]="catPupilStyleTransform()">
                  <circle cx="49" cy="39" r="2.7" fill="#2b2d42" />
                  <circle cx="71" cy="39" r="2.7" fill="#2b2d42" />
                  <circle cx="47.8" cy="37.5" r="1" fill="#ffffff" />
                  <circle cx="69.8" cy="37.5" r="1" fill="#ffffff" />
                </g>
              </g>
              <g class="cat-eyes-happy">
                <path d="M 44 40 Q 49 33 54 40" fill="none" stroke="#2b2d42" stroke-width="2.5" stroke-linecap="round" />
                <path d="M 66 40 Q 71 33 76 40" fill="none" stroke="#2b2d42" stroke-width="2.5" stroke-linecap="round" />
              </g>
              <polygon points="58,42 62,42 60,45" fill="#e65c84" />
              <path d="M 55 47 Q 57.5 50 60 46 Q 62.5 50 65 47" fill="none" stroke="#2b2d42" stroke-width="2.2" stroke-linecap="round" />
              <line x1="25" y1="41" x2="36" y2="43" stroke="#2b2d42" stroke-width="2" stroke-linecap="round" />
              <line x1="24" y1="47" x2="36" y2="47" stroke="#2b2d42" stroke-width="2" stroke-linecap="round" />
              <line x1="95" y1="41" x2="84" y2="43" stroke="#2b2d42" stroke-width="2" stroke-linecap="round" />
              <line x1="96" y1="47" x2="84" y2="47" stroke="#2b2d42" stroke-width="2" stroke-linecap="round" />
              <ellipse class="cat-paw-left" cx="44" cy="62" rx="7" ry="5" fill="#ffffff" stroke="#2b2d42" stroke-width="2.8" />
              <ellipse class="cat-paw-right" cx="76" cy="62" rx="7" ry="5" fill="#ffffff" stroke="#2b2d42" stroke-width="2.8" />
            </svg>

            <!-- Blooming Plant SVG (Alternative Companion) -->
            <svg class="companion-svg companion-plant-svg" viewBox="0 0 120 76" aria-label="Focus Sprout Companion">
              <g class="plant-growth" id="plant-growth-group" [style.transform]="plantGrowthStyleTransform()">
                <path d="M 60 54 Q 58 38 60 22" fill="none" stroke="#166534" stroke-width="3.2" stroke-linecap="round" />
                <path class="plant-leaf-left" d="M 59 42 C 44 40, 42 28, 58 34 Z" fill="#86efac" stroke="#2b2d42" stroke-width="2.2" stroke-linejoin="round" />
                <path class="plant-leaf-right" d="M 61 36 C 76 34, 78 22, 62 28 Z" fill="#4ade80" stroke="#2b2d42" stroke-width="2.2" stroke-linejoin="round" />
                <g
                  class="plant-flower"
                  id="plant-flower-bloom"
                  [style.transform]="plantFlowerStyleTransform()"
                  [style.opacity]="plantFlowerOpacity()">
                  <circle cx="60" cy="14" r="5" fill="#ffb7c5" stroke="#2b2d42" stroke-width="2" />
                  <circle cx="53" cy="19" r="5" fill="#ffb7c5" stroke="#2b2d42" stroke-width="2" />
                  <circle cx="67" cy="19" r="5" fill="#ffb7c5" stroke="#2b2d42" stroke-width="2" />
                  <circle cx="56" cy="25" r="5" fill="#ffb7c5" stroke="#2b2d42" stroke-width="2" />
                  <circle cx="64" cy="25" r="5" fill="#ffb7c5" stroke="#2b2d42" stroke-width="2" />
                  <circle cx="60" cy="20" r="4.2" fill="#fde047" stroke="#2b2d42" stroke-width="2" />
                </g>
              </g>
              <polygon points="44,54 76,54 72,70 48,70" fill="#f4a261" stroke="#2b2d42" stroke-width="2.6" stroke-linejoin="round" />
              <rect x="41" y="49" width="38" height="6" rx="3" fill="#e76f51" stroke="#2b2d42" stroke-width="2.6" />
            </svg>
          </div>

          <div class="analog-timer-container">
            <svg class="timer-ring-svg" viewBox="0 0 200 200">
              <circle class="ring-bg" cx="100" cy="100" r="82" />
              <circle
                class="ring-progress"
                id="timer-ring-progress"
                cx="100"
                cy="100"
                r="82"
                [style.strokeDashoffset]="timer.strokeDashoffset()" />
              <line
                class="timer-hand"
                id="timer-hand"
                x1="100"
                y1="100"
                x2="100"
                y2="30"
                [style.transform]="'rotate(' + timer.handRotationDegrees() + 'deg)'" />
              <circle class="timer-hand-cap" cx="100" cy="100" r="5" fill="#e65c84" />
            </svg>
            <div class="timer-center-display">
              <div id="timer-time-display" class="timer-time">{{ timer.timeDisplayText() }}</div>
              <div id="timer-label-display" class="timer-sublabel">{{ timer.sublabelDisplayText() }}</div>
            </div>
          </div>
        </div>

        <!-- Timer Controls -->
        <div class="timer-controls">
          <button
            type="button"
            id="timer-toggle-btn"
            class="timer-btn"
            [class.primary-btn]="!timer.isRunning()"
            [class.secondary-btn]="timer.isRunning()"
            (click)="timer.toggleStartPause()">
            {{ timer.isRunning() ? '⏸ Pause' : '► Start' }}
          </button>
          <button
            type="button"
            id="timer-reset-btn"
            class="timer-btn secondary-btn"
            (click)="timer.resetTimer()">
            ↺ Reset
          </button>
          <button
            type="button"
            id="timer-complete-btn"
            class="timer-btn complete-btn"
            (click)="onCompleteActiveItem()">
            ✓ Complete
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

  readonly companionState = computed<'celebrating' | 'running' | 'idle'>(() => {
    if (this.uiModal.isCompanionCelebrating()) return 'celebrating';
    if (this.timer.isRunning()) return 'running';
    return 'idle';
  });

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

  readonly catPupilStyleTransform = computed(() => {
    const rad = ((this.timer.handRotationDegrees() - 90) * Math.PI) / 180;
    const dx = (Math.cos(rad) * 1.9).toFixed(2);
    const dy = (Math.sin(rad) * 1.9 + 0.8).toFixed(2);
    return `translate(${dx}px, ${dy}px)`;
  });

  readonly plantProgressRatio = computed(() => {
    const total = this.timer.totalSeconds() || 1500;
    const rem = Math.max(0, this.timer.remainingSeconds());
    return Math.max(0, Math.min(1, 1 - rem / total));
  });

  readonly plantGrowthStyleTransform = computed(() => {
    const scale = (0.72 + this.plantProgressRatio() * 0.34).toFixed(2);
    return `scale(${scale})`;
  });

  readonly plantFlowerStyleTransform = computed(() => {
    if (this.uiModal.isCompanionCelebrating()) return 'scale(1.15)';
    const scale = (0.25 + this.plantProgressRatio() * 0.85).toFixed(2);
    return `scale(${scale})`;
  });

  readonly plantFlowerOpacity = computed(() => {
    if (this.uiModal.isCompanionCelebrating()) return '1';
    const p = this.plantProgressRatio();
    return p > 0.15 ? String(Math.min(1, p * 1.2)) : '0.35';
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
