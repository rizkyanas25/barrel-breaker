const AUDIO_STATE_KEY = '__barrel_breaker_audio_state__';
const AUDIO_MUTE_STORAGE_KEY = 'barrel_breaker_audio_muted';

function readSavedMuteState() {
  try {
    const raw = localStorage.getItem(AUDIO_MUTE_STORAGE_KEY);
    return raw === '1' || raw === 'true';
  } catch (error) {
    return false;
  }
}

function writeSavedMuteState(muted) {
  try {
    localStorage.setItem(AUDIO_MUTE_STORAGE_KEY, muted ? '1' : '0');
  } catch (error) {
    // Ignore storage failures (private mode or blocked storage).
  }
}

function getAudioState(scene) {
  const game = scene.game;
  if (!game[AUDIO_STATE_KEY]) {
    game[AUDIO_STATE_KEY] = {
      muted: readSavedMuteState(),
    };
  }
  return game[AUDIO_STATE_KEY];
}

function applyMuteToSoundManager(scene, muted) {
  const soundManager = scene.sound;
  if (!soundManager || soundManager.noAudio) return;

  if (typeof soundManager.setMute === 'function') {
    soundManager.setMute(muted);
  } else {
    soundManager.mute = muted;
  }
}

export function initAudioSettings(scene) {
  const state = getAudioState(scene);
  applyMuteToSoundManager(scene, state.muted);
  return state;
}

export function isAudioMuted(scene) {
  return getAudioState(scene).muted;
}

export function setAudioMuted(scene, muted) {
  const state = getAudioState(scene);
  state.muted = Boolean(muted);
  writeSavedMuteState(state.muted);
  applyMuteToSoundManager(scene, state.muted);
  return state.muted;
}

export function toggleAudioMuted(scene) {
  return setAudioMuted(scene, !isAudioMuted(scene));
}
