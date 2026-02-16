import { initAudioSettings, isAudioMuted, toggleAudioMuted } from './settings.js';

export function addAudioToggle(scene, options = {}) {
  initAudioSettings(scene);

  const x = options.x ?? scene.scale.width - 16;
  const y = options.y ?? 14;
  const depth = options.depth ?? 1000;

  const button = scene.add
    .text(x, y, '', {
      fontSize: '11px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      color: '#FFE39F',
      backgroundColor: '#000000AA',
      padding: { x: 8, y: 4 },
    })
    .setOrigin(1, 0)
    .setDepth(depth)
    .setAlpha(0.92)
    .setInteractive({ useHandCursor: true });

  const refreshLabel = () => {
    const muted = isAudioMuted(scene);
    button.setText(muted ? 'SOUND OFF' : 'SOUND ON');
    button.setColor(muted ? '#FF8888' : '#FFE39F');
  };

  refreshLabel();

  button.on('pointerover', () => {
    button.setAlpha(1);
  });

  button.on('pointerout', () => {
    button.setAlpha(0.92);
  });

  button.on('pointerdown', (pointer, localX, localY, event) => {
    event?.stopPropagation?.();

    const muted = toggleAudioMuted(scene);
    refreshLabel();

    if (!muted && typeof options.onUnmute === 'function') {
      options.onUnmute();
    }
    if (muted && typeof options.onMute === 'function') {
      options.onMute();
    }
  });

  return button;
}
