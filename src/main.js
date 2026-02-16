import Phaser from 'phaser';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';

const config = {
  type: Phaser.AUTO,
  width: 480,
  height: 854,
  parent: 'game-container',
  backgroundColor: '#1a0e05',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [MenuScene, GameScene, GameOverScene],
};

const game = new Phaser.Game(config);
