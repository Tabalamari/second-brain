import { Injectable, signal } from '@angular/core';

export type AmbientSoundMode = 'off' | 'rain' | 'brown' | 'vinyl';

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  readonly ambientMode = signal<AmbientSoundMode>('off');

  private ambientCtx: AudioContext | null = null;
  private ambientSource: AudioBufferSourceNode | null = null;
  private ambientLfo: OscillatorNode | null = null;

  playTimerCompletionSound(): void {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const chimeNotes = [
        { freq: 523.25, time: 0.0, duration: 0.65 }, // C5
        { freq: 659.25, time: 0.22, duration: 0.65 }, // E5
        { freq: 783.99, time: 0.44, duration: 0.75 }, // G5
        { freq: 1046.5, time: 0.78, duration: 5.0 } // C6
      ];

      chimeNotes.forEach(note => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(note.freq, ctx.currentTime + note.time);

        gain.gain.setValueAtTime(0.001, ctx.currentTime + note.time);
        gain.gain.linearRampToValueAtTime(
          0.2,
          ctx.currentTime + note.time + 0.02
        );
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          ctx.currentTime + note.time + note.duration
        );

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + note.time);
        osc.stop(ctx.currentTime + note.time + note.duration);
      });
    } catch (e) {
      console.log('Musical audio playback not allowed or failed:', e);
    }
  }

  playPencilScratchSound(): void {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const duration = 0.38;
      const sampleRate = ctx.sampleRate;
      const bufferSize = Math.floor(sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        const t = i / duration / sampleRate;
        const stroke1 = Math.exp(-Math.pow((t - 0.28) / 0.22, 2));
        const stroke2 = 0.65 * Math.exp(-Math.pow((t - 0.75) / 0.16, 2));
        const grain = Math.sin(i * 0.17) * 0.3 + 0.7;
        data[i] = (Math.random() * 2 - 1) * (stroke1 + stroke2) * grain;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(2200, ctx.currentTime);
      bandpass.Q.setValueAtTime(1.8, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.28, ctx.currentTime);

      noise.connect(bandpass);
      bandpass.connect(gain);
      gain.connect(ctx.destination);

      noise.start();
    } catch (e) {
      console.log('Pencil sound playback skipped:', e);
    }
  }

  playSoftPopSound(): void {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.11);

      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.13);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.14);
    } catch {
      // Ignore audio errors
    }
  }

  cycleAmbientSound(): AmbientSoundMode {
    const order: AmbientSoundMode[] = ['off', 'rain', 'brown', 'vinyl'];
    const current = this.ambientMode();
    const next = order[(order.indexOf(current) + 1) % order.length];
    this.ambientMode.set(next);
    this.startAmbientSound(next);
    return next;
  }

  stopAmbientSound(): void {
    if (this.ambientSource) {
      try {
        this.ambientSource.stop();
        this.ambientSource.disconnect();
      } catch {
        // Ignore stop errors
      }
      this.ambientSource = null;
    }
    if (this.ambientLfo) {
      try {
        this.ambientLfo.stop();
        this.ambientLfo.disconnect();
      } catch {
        // Ignore stop errors
      }
      this.ambientLfo = null;
    }
  }

  private startAmbientSound(mode: AmbientSoundMode): void {
    this.stopAmbientSound();
    if (mode === 'off') return;

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.ambientCtx) {
        this.ambientCtx = new AudioCtx();
      }
      const ctx = this.ambientCtx;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const sampleRate = ctx.sampleRate;
      const bufferSize = sampleRate * 5;
      const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
      const data = buffer.getChannelData(0);

      if (mode === 'brown') {
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          data[i] = (lastOut + 0.02 * white) / 1.02;
          lastOut = data[i];
          data[i] *= 2.8;
        }
      } else if (mode === 'rain') {
        let b0 = 0;
        let b1 = 0;
        let b2 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99765 * b0 + white * 0.099046;
          b1 = 0.963 * b1 + white * 0.2965164;
          b2 = 0.57 * b2 + white * 1.0526913;
          data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.12;
        }
      } else if (mode === 'vinyl') {
        let warm = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          warm = (warm + 0.03 * white) / 1.03;
          const crackle =
            Math.random() > 0.9985 ? (Math.random() * 2 - 1) * 0.9 : 0;
          data[i] = warm * 1.2 + crackle;
        }
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      if (mode === 'brown') {
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(480, ctx.currentTime);
        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 0.35);
      } else if (mode === 'rain') {
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(950, ctx.currentTime);
        filter.Q.setValueAtTime(0.7, ctx.currentTime);

        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.setValueAtTime(0.18, ctx.currentTime);
        lfoGain.gain.setValueAtTime(180, ctx.currentTime);
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        lfo.start();
        this.ambientLfo = lfo;

        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.35);
      } else if (mode === 'vinyl') {
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1350, ctx.currentTime);
        filter.Q.setValueAtTime(0.55, ctx.currentTime);
        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.35);
      }

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start();

      this.ambientSource = source;
    } catch (e) {
      console.log('Ambient audio error:', e);
    }
  }
}

