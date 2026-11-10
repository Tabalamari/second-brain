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
            [class.active]="audio.ambientMode() !== 'off'"
            [class.is-playing]="audio.ambientMode() !== 'off'"
            (click)="audio.cycleAmbientSound()"
            title="Toggle Ambient Focus Sound (Off / Rain / Brown Noise / Vinyl)">
            title="Click to cycle ambient focus sound (Rain / Brown Noise / Vinyl / Off)">
            {{ ambientButtonLabel() }}
          </button>
          <span
            class="status-badge"
            [class.active]="timer.isRunning()"
            [class.inactive]="!timer.isRunning()">
          <span class="timer-active-indicator" id="timer-status-badge">
            {{ timer.statusBadgeText() }}
          </span>
        </div>
      </div>

      <div class="timer-body">
      <div class="timer-card-inner" id="timer-card-inner">
        <!-- Active Task / Meeting Title -->
        <div class="timer-active-title">
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
            <!-- Sleep Zzz bubbles -->
            <div class="companion-zzz" aria-hidden="true">
              <span>z</span><span>Z</span><span>z</span>
            </div>
            <!-- Celebration sparkles -->
            <div class="companion-sparkles" aria-hidden="true">
              <span>✦</span><span>♥</span><span>✦</span>
            </div>

              <!-- Floating Zzz when inactive -->
              <g class="companion-zzz">
                <text x="62" y="18" font-family="Shantell Sans, cursive" font-size="11" font-weight="700" fill="#1e293b">z</text>
                <text x="69" y="10" font-family="Shantell Sans, cursive" font-size="14" font-weight="700" fill="#e65c84">Z</text>
            <!-- Doodle Cat SVG -->
            <svg class="companion-svg companion-cat-svg" viewBox="0 0 120 72" aria-label="Focus Cat Companion">
              <!-- Wagging Tail -->
              <path class="cat-tail" d="M 92 56 Q 112 46 108 28" fill="none" stroke="#2b2d42" stroke-width="4.5" stroke-linecap="round" />
              <!-- Cat Head & Body perched on rim -->
              <path class="cat-body" d="M 32 62 C 28 38, 34 24, 36 12 L 48 24 C 55 21, 65 21, 72 24 L 84 12 C 86 24, 92 38, 88 62 Z" fill="#ffffff" stroke="#2b2d42" stroke-width="3" stroke-linejoin="round" />
              <!-- Pink Inner Ears -->
              <polygon points="39,18 37,27 45,25" fill="#ffb7c5" />
              <polygon points="81,18 83,27 75,25" fill="#ffb7c5" />
              <!-- Rosy Cheeks -->
              <ellipse cx="43" cy="46" rx="4.5" ry="2.5" fill="#ffb7c5" />
              <ellipse cx="77" cy="46" rx="4.5" ry="2.5" fill="#ffb7c5" />
              <!-- Sleeping Eyes (Idle) -->
              <g class="cat-eyes-sleep">
                <path d="M 44 38 Q 49 43 54 38" fill="none" stroke="#2b2d42" stroke-width="2.5" stroke-linecap="round" />
                <path d="M 66 38 Q 71 43 76 38" fill="none" stroke="#2b2d42" stroke-width="2.5" stroke-linecap="round" />
              </g>
              <!-- Awake Eyes Watching the Clock Hand (Running) -->
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
              <!-- Happy Celebrating Eyes -->
              <g class="cat-eyes-happy">
                <path d="M 44 40 Q 49 33 54 40" fill="none" stroke="#2b2d42" stroke-width="2.5" stroke-linecap="round" />
                <path d="M 66 40 Q 71 33 76 40" fill="none" stroke="#2b2d42" stroke-width="2.5" stroke-linecap="round" />
              </g>
              <!-- Nose & Mouth (:3) -->
              <polygon points="58,42 62,42 60,45" fill="#e65c84" />
              <path d="M 55 47 Q 57.5 50 60 46 Q 62.5 50 65 47" fill="none" stroke="#2b2d42" stroke-width="2.2" stroke-linecap="round" />
              <!-- Whiskers -->
              <line x1="25" y1="41" x2="36" y2="43" stroke="#2b2d42" stroke-width="2" stroke-linecap="round" />
              <line x1="24" y1="47" x2="36" y2="47" stroke="#2b2d42" stroke-width="2" stroke-linecap="round" />
              <line x1="95" y1="41" x2="84" y2="43" stroke="#2b2d42" stroke-width="2" stroke-linecap="round" />
              <line x1="96" y1="47" x2="84" y2="47" stroke="#2b2d42" stroke-width="2" stroke-linecap="round" />
              <!-- Paws resting on the clock edge -->
              <ellipse class="cat-paw-left" cx="44" cy="62" rx="7" ry="5" fill="#ffffff" stroke="#2b2d42" stroke-width="2.8" />
              <ellipse class="cat-paw-right" cx="76" cy="62" rx="7" ry="5" fill="#ffffff" stroke="#2b2d42" stroke-width="2.8" />
            </svg>

              <!-- Celebration sparkles -->
              <g class="companion-sparkles">
                <text x="4" y="20" font-size="14">✨</text>
                <text x="64" y="20" font-size="14">🎉</text>
            <!-- Blooming Plant SVG (Alternative Companion) -->
            <svg class="companion-svg companion-plant-svg" viewBox="0 0 120 76" aria-label="Focus Sprout Companion">
              <!-- Growing Stem & Leaves group -->
              <g class="plant-growth" id="plant-growth-group" [style.transform]="plantGrowthStyleTransform()">
                <!-- Stem -->
                <path d="M 60 54 Q 58 38 60 22" fill="none" stroke="#166534" stroke-width="3.2" stroke-linecap="round" />
                <!-- Left Leaf -->
                <path class="plant-leaf-left" d="M 59 42 C 44 40, 42 28, 58 34 Z" fill="#86efac" stroke="#2b2d42" stroke-width="2.2" stroke-linejoin="round" />
                <!-- Right Leaf -->
                <path class="plant-leaf-right" d="M 61 36 C 76 34, 78 22, 62 28 Z" fill="#4ade80" stroke="#2b2d42" stroke-width="2.2" stroke-linejoin="round" />
                <!-- Blooming Flower at top -->
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
              <!-- Cute Pot perched on timer rim -->
              <polygon points="44,54 76,54 72,70 48,70" fill="#f4a261" stroke="#2b2d42" stroke-width="2.6" stroke-linejoin="round" />
              <rect x="41" y="49" width="38" height="6" rx="3" fill="#e76f51" stroke="#2b2d42" stroke-width="2.6" />
            </svg>
          </div>

          <div class="analog-timer-container">
            <svg class="timer-svg" viewBox="0 0 220 220">
              <!-- Outer Border Circle -->
              <circle cx="110" cy="110" r="95" class="clock-outer-ring" />

              <!-- Elapsed / Remaining Pink Pie Sector using stroke-dasharray -->
            <svg class="timer-ring-svg" viewBox="0 0 200 200">
              <circle class="ring-bg" cx="100" cy="100" r="82" />
              <circle
                cx="110"
                cy="110"
                r="47.5"
                class="clock-sector-ring"
                [style.strokeDasharray]="timer.RING_CIRCUMFERENCE"
                class="ring-progress"
                id="timer-ring-progress"
                cx="100"
                cy="100"
                r="82"
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
            id="timer-toggle-btn"
            class="timer-btn"
            [class.primary-btn]="!timer.isRunning()"
            [class.secondary-btn]="timer.isRunning()"
            (click)="timer.toggleStartPause()">
            {{ timer.isRunning() ? 'Pause' : 'Start' }}
            {{ timer.isRunning() ? '⏸ Pause' : '► Start' }}
          </button>
          <button
            type="button"
            id="timer-reset-btn"
            class="timer-btn secondary-btn"
            (click)="timer.resetTimer()">
            Reset
            ↺ Reset
          </button>
          <button
            type="button"
            id="timer-complete-btn"
            class="timer-btn complete-btn"
            (click)="onCompleteActiveItem()"
            title="Mark selected item completed">
            Complete
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

  readonly catPupilTransform = computed(() => {
    const angleRad = ((this.timer.handRotationDegrees() - 90) * Math.PI) / 180;
    const lookX = (Math.cos(angleRad) * 1.4).toFixed(2);
    const lookY = (Math.sin(angleRad) * 1.4).toFixed(2);
    return `translate(${lookX}, ${lookY})`;
  readonly catPupilStyleTransform = computed(() => {
      const rad = ((this.timer.handRotationDegrees() - 90) * Math.PI) / 180;
      const dx = (Math.cos(rad) * 1.9).toFixed(2);
      const dy = (Math.sin(rad) * 1.9 + 0.8).toFixed(2);
      return `translate(${dx}px, ${dy}px)`;
    });

  readonly plantStemTransform = computed(() => {
    const total = this.timer.totalSeconds();
    const rem = this.timer.remainingSeconds();
    const progress = total > 0 ? Math.max(0, Math.min(1, 1 - rem / total)) : 0;
    const scale = (0.75 + progress * 0.4).toFixed(2);
    return `translate(40, 44) scale(${scale}) translate(-40, -44)`;
  readonly plantProgressRatio = computed(() => {
      const total = this.timer.totalSeconds() || 1500;
      const rem = Math.max(0, this.timer.remainingSeconds());
      return Math.max(0, Math.min(1, 1 - rem / total));
    });

  readonly plantBloomVisible = computed(() => {
    const total = this.timer.totalSeconds();
    const rem = this.timer.remainingSeconds();
    const progress = total > 0 ? 1 - rem / total : 0;
    return progress > 0.5 || this.uiModal.isCompanionCelebrating();
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
