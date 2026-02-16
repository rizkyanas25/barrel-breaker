import { isAudioMuted } from './settings.js';

function createNoopSfx() {
  const noop = () => {};
  return {
    uiHover: noop,
    uiPress: noop,
    uiConfirm: noop,
    hit: noop,
    gold: noop,
    bomb: noop,
    timeBonus: noop,
    combo: noop,
    ready: noop,
    go: noop,
    gameOver: noop,
    success: noop,
    destroy: noop,
  };
}

export function createProceduralSfx(scene, options = {}) {
  const masterGain =
    typeof options.masterGain === 'number' ? options.masterGain : 0.16;
  const soundManager = scene.sound;
  const context = soundManager?.context ?? null;
  const destination = soundManager?.destination ?? context?.destination ?? null;

  if (!context || !destination || soundManager?.noAudio) {
    return createNoopSfx();
  }

  let disposed = false;
  let hoverBlockUntil = 0;

  const unlockAudio = () => {
    if (disposed) return;

    if (soundManager.locked && typeof soundManager.unlock === 'function') {
      soundManager.unlock();
    }

    if (context.state === 'suspended') {
      void context.resume().catch(() => {});
    }
  };

  const playTone = ({
    type = 'square',
    frequency = 440,
    endFrequency = frequency,
    duration = 0.1,
    attack = 0.004,
    volume = 1,
    delay = 0,
    detune = 0,
  } = {}) => {
    if (disposed) return;
    if (isAudioMuted(scene)) return;
    unlockAudio();

    const startAt = context.currentTime + delay;
    const safeFreq = Math.max(20, frequency);
    const safeEndFreq = Math.max(20, endFrequency);
    const safeDuration = Math.max(0.02, duration);
    const peak = Math.max(0.0001, masterGain * Math.max(0.001, volume));

    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(safeFreq, startAt);
    oscillator.detune.setValueAtTime(detune, startAt);
    if (safeEndFreq !== safeFreq) {
      oscillator.frequency.exponentialRampToValueAtTime(
        safeEndFreq,
        startAt + safeDuration,
      );
    }

    gainNode.gain.setValueAtTime(0.0001, startAt);
    gainNode.gain.exponentialRampToValueAtTime(
      peak,
      startAt + Math.min(attack, safeDuration * 0.45),
    );
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + safeDuration);

    oscillator.connect(gainNode);
    gainNode.connect(destination);

    oscillator.start(startAt);
    oscillator.stop(startAt + safeDuration + 0.05);
    oscillator.onended = () => {
      oscillator.disconnect();
      gainNode.disconnect();
    };
  };

  return {
    uiHover() {
      const now = Date.now();
      if (now < hoverBlockUntil) return;
      hoverBlockUntil = now + 75;
      playTone({
        type: 'triangle',
        frequency: 720,
        endFrequency: 780,
        duration: 0.045,
        volume: 0.4,
      });
    },
    uiPress() {
      playTone({
        type: 'square',
        frequency: 260,
        endFrequency: 210,
        duration: 0.06,
        volume: 0.8,
      });
      playTone({
        type: 'triangle',
        frequency: 360,
        endFrequency: 430,
        duration: 0.055,
        volume: 0.45,
        delay: 0.04,
      });
    },
    uiConfirm() {
      playTone({
        type: 'triangle',
        frequency: 420,
        endFrequency: 820,
        duration: 0.16,
        volume: 0.85,
      });
      playTone({
        type: 'sine',
        frequency: 860,
        endFrequency: 1120,
        duration: 0.09,
        volume: 0.6,
        delay: 0.07,
      });
    },
    hit() {
      playTone({
        type: 'square',
        frequency: 320,
        endFrequency: 190,
        duration: 0.085,
        volume: 0.85,
      });
    },
    gold() {
      playTone({
        type: 'triangle',
        frequency: 560,
        endFrequency: 860,
        duration: 0.12,
        volume: 0.9,
      });
      playTone({
        type: 'sine',
        frequency: 860,
        endFrequency: 1140,
        duration: 0.08,
        volume: 0.7,
        delay: 0.06,
      });
    },
    bomb() {
      playTone({
        type: 'sawtooth',
        frequency: 240,
        endFrequency: 56,
        duration: 0.26,
        volume: 1,
      });
      playTone({
        type: 'square',
        frequency: 88,
        endFrequency: 38,
        duration: 0.2,
        volume: 0.5,
        delay: 0.05,
      });
    },
    timeBonus() {
      playTone({
        type: 'sine',
        frequency: 430,
        endFrequency: 920,
        duration: 0.14,
        volume: 0.9,
      });
      playTone({
        type: 'triangle',
        frequency: 920,
        endFrequency: 1260,
        duration: 0.09,
        volume: 0.7,
        delay: 0.07,
      });
    },
    combo() {
      playTone({
        type: 'triangle',
        frequency: 480,
        endFrequency: 640,
        duration: 0.075,
        volume: 0.75,
      });
      playTone({
        type: 'triangle',
        frequency: 640,
        endFrequency: 820,
        duration: 0.075,
        volume: 0.72,
        delay: 0.04,
      });
    },
    ready() {
      playTone({
        type: 'square',
        frequency: 230,
        endFrequency: 180,
        duration: 0.12,
        volume: 0.65,
      });
    },
    go() {
      playTone({
        type: 'triangle',
        frequency: 300,
        endFrequency: 760,
        duration: 0.2,
        volume: 0.85,
      });
    },
    gameOver() {
      playTone({
        type: 'sawtooth',
        frequency: 330,
        endFrequency: 110,
        duration: 0.3,
        volume: 0.9,
      });
      playTone({
        type: 'square',
        frequency: 140,
        endFrequency: 72,
        duration: 0.24,
        volume: 0.45,
        delay: 0.07,
      });
    },
    success() {
      playTone({
        type: 'triangle',
        frequency: 520,
        endFrequency: 820,
        duration: 0.14,
        volume: 0.82,
      });
      playTone({
        type: 'triangle',
        frequency: 820,
        endFrequency: 1080,
        duration: 0.14,
        volume: 0.8,
        delay: 0.08,
      });
    },
    destroy() {
      disposed = true;
    },
  };
}
