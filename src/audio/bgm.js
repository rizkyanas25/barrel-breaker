import { initAudioSettings } from './settings.js';

const BGM_STATE_KEY = '__barrel_breaker_bgm_state__';

function getBgmState(scene) {
  const game = scene.game;
  if (!game[BGM_STATE_KEY]) {
    game[BGM_STATE_KEY] = {
      key: null,
      sound: null,
    };
  }
  return game[BGM_STATE_KEY];
}

function unlockAudioIfNeeded(scene) {
  const soundManager = scene.sound;
  if (!soundManager || soundManager.noAudio) return;

  if (soundManager.locked && typeof soundManager.unlock === 'function') {
    soundManager.unlock();
  }

  const context = soundManager.context;
  if (context && context.state === 'suspended') {
    void context.resume().catch(() => {});
  }
}

export function playGlobalBgm(scene, key, options = {}) {
  initAudioSettings(scene);

  const soundManager = scene.sound;
  if (!soundManager || soundManager.noAudio) return null;

  const state = getBgmState(scene);
  const config = {
    loop: true,
    volume: typeof options.volume === 'number' ? options.volume : 0.3,
  };

  if (state.sound && state.key === key) {
    state.sound.setLoop(config.loop);
    state.sound.setVolume(config.volume);
    if (!state.sound.isPlaying) {
      unlockAudioIfNeeded(scene);
      state.sound.play();
    }
    return state.sound;
  }

  if (state.sound) {
    state.sound.stop();
    state.sound.destroy();
    state.sound = null;
    state.key = null;
  }

  if (!scene.cache.audio.exists(key)) {
    return null;
  }

  const nextTrack = soundManager.add(key, config);
  state.sound = nextTrack;
  state.key = key;

  unlockAudioIfNeeded(scene);
  const started = nextTrack.play();

  if (!started && soundManager.locked) {
    soundManager.once('unlocked', () => {
      if (state.sound === nextTrack && !nextTrack.isPlaying) {
        nextTrack.play();
      }
    });
  }

  return nextTrack;
}
