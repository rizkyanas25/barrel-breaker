import Phaser from 'phaser';
import { createProceduralSfx } from '../audio/sfx.js';
import { playGlobalBgm } from '../audio/bgm.js';
import { addAudioToggle } from '../audio/toggle.js';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data) {
    this.finalScore = data.score || 0;
    this.barrelsSmashed = data.barrelsSmashed || 0;
    this.maxCombo = data.maxCombo || 0;
    this.isNewHigh = data.isNewHigh || false;
    this.gameOverReason = data.reason === 'health' ? 'health' : 'timeout';
  }

  create() {
    const { width, height } = this.scale;
    const isTimeout = this.gameOverReason === 'timeout';
    this.sfx = createProceduralSfx(this, { masterGain: 0.13 });
    this.events.once('shutdown', () => this.sfx?.destroy());
    playGlobalBgm(this, 'game_bgm', { volume: 0.22 });
    addAudioToggle(this, {
      x: width - 14,
      y: 14,
      depth: 120,
      onUnmute: () => this.sfx.uiPress(),
    });

    // Background
    this.add.image(width / 2, height / 2, 'bg_menu').setAlpha(0.5);

    // Dark overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.55);
    overlay.fillRect(0, 0, width, height);

    // Game Over title
    const gameOverText = this.add
      .text(width / 2, height * 0.1, isTimeout ? 'TIME UP' : 'GAME OVER', {
        fontSize: '48px',
        fontFamily: '"Georgia", serif',
        fontStyle: 'bold',
        color: isTimeout ? '#66E3A3' : '#FF6B6B',
        stroke: '#000000',
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    // ── Result Character ──
    const characterKey = isTimeout ? 'luffy_win' : 'luffy_lose';
    const characterAnim = isTimeout ? 'luffy_win_celebrate' : 'luffy_lose_loop';
    const characterScale = isTimeout ? 2.3 : 2.5;
    const characterY = height * 0.34;
    let luffy = null;

    if (this.textures.exists(characterKey)) {
      luffy = this.add
        .sprite(width / 2, characterY, characterKey)
        .setScale(characterScale)
        .setOrigin(0.5, 1);
      if (this.anims.exists(characterAnim)) {
        luffy.play(characterAnim, true);
      }
    } else {
      luffy = this.add
        .image(width / 2, height * 0.25, 'luffy_portrait')
        .setScale(1);
    }

    if (this.isNewHigh || isTimeout) {
      this.tweens.add({
        targets: luffy,
        y: luffy.y - 8,
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // Luffy quote
    const quotes = this.isNewHigh
      ? [
          '"That was a great run!"',
          '"New personal best!"',
          '"Let us go again!"',
        ]
      : isTimeout
        ? ['"Great timing!"', '"Solid run!"', '"Ready for another one?"']
        : [
            '"I will not give up!"',
            '"Let us try again!"',
            '"One more round!"',
          ];
    const quote = quotes[Phaser.Math.Between(0, quotes.length - 1)];

    this.add
      .text(width / 2, height * 0.37, quote, {
        fontSize: '14px',
        fontFamily: 'Arial',
        fontStyle: 'italic',
        color: '#FFD700',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    // New high score badge
    if (this.isNewHigh) {
      this.sfx.success();
      const badge = this.add
        .text(width / 2, height * 0.42, 'NEW HIGH SCORE', {
          fontSize: '20px',
          fontFamily: 'Arial',
          fontStyle: 'bold',
          color: '#FFD700',
          stroke: '#000000',
          strokeThickness: 4,
        })
        .setOrigin(0.5);

      this.tweens.add({
        targets: badge,
        scale: 1.1,
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // ── Result Card ──
    const cardY = height * 0.52;
    const card = this.add.graphics();
    card.fillStyle(0x1a0e05, 0.85);
    card.fillRoundedRect(40, cardY - 30, width - 80, 220, 16);
    card.lineStyle(2, 0xd4a94b, 0.5);
    card.strokeRoundedRect(40, cardY - 30, width - 80, 220, 16);

    // Score
    this.add
      .text(width / 2, cardY - 10, 'FINAL SCORE', {
        fontSize: '14px',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        color: '#D4A94B',
      })
      .setOrigin(0.5);

    const scoreDisplay = this.add
      .text(width / 2, cardY + 30, '0', {
        fontSize: '52px',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        color: '#FFFFFF',
      })
      .setOrigin(0.5);

    // Animate score counting
    this.tweens.addCounter({
      from: 0,
      to: this.finalScore,
      duration: 1200,
      ease: 'Power2',
      onUpdate: (tween) => {
        scoreDisplay.setText(String(Math.floor(tween.getValue())));
      },
    });

    // Stats
    const statsY = cardY + 80;
    const statsData = [
      { label: 'Barrels Smashed', value: this.barrelsSmashed },
      { label: 'Best Combo', value: `${this.maxCombo}x` },
      {
        label: 'High Score',
        value: localStorage.getItem('barrel_breaker_high') || 0,
      },
    ];

    statsData.forEach((stat, i) => {
      const sy = statsY + i * 35;
      this.add.text(75, sy, stat.label, {
        fontSize: '14px',
        fontFamily: 'Arial',
        color: '#CCBBAA',
      });
      this.add
        .text(width - 75, sy, String(stat.value), {
          fontSize: '16px',
          fontFamily: 'Arial',
          fontStyle: 'bold',
          color: '#FFFFFF',
        })
        .setOrigin(1, 0);
    });

    // ── Star Rating ──
    const starsY = height * 0.78;
    const starCount =
      this.finalScore >= 1000
        ? 3
        : this.finalScore >= 400
          ? 2
          : this.finalScore >= 100
            ? 1
            : 0;

    for (let i = 0; i < 3; i++) {
      const star = this.add
        .text(width / 2 - 50 + i * 50, starsY, i < starCount ? '⭐' : '☆', {
          fontSize: '36px',
        })
        .setOrigin(0.5)
        .setAlpha(0);

      this.tweens.add({
        targets: star,
        alpha: 1,
        scale: { from: 2, to: 1 },
        duration: 400,
        delay: 1300 + i * 200,
        ease: 'Back.easeOut',
      });
    }

    // ── Buttons ──
    const btnY = height * 0.88;

    const retryBtn = this.add
      .image(width / 2 - 70, btnY, 'btn')
      .setScale(0.8)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(width / 2 - 70, btnY - 3, 'RETRY', {
        fontSize: '20px',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        color: '#FFFFFF',
        stroke: '#4A2800',
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    retryBtn.on('pointerover', () => {
      this.sfx.uiHover();
      retryBtn.setScale(0.85);
    });
    retryBtn.on('pointerout', () => retryBtn.setScale(0.8));
    retryBtn.on('pointerdown', () => {
      this.sfx.uiPress();
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.time.delayedCall(300, () => this.scene.start('GameScene'));
    });

    const menuBtn = this.add
      .image(width / 2 + 70, btnY, 'btn')
      .setScale(0.8)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(width / 2 + 70, btnY - 3, 'MENU', {
        fontSize: '20px',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        color: '#FFFFFF',
        stroke: '#4A2800',
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    menuBtn.on('pointerover', () => {
      this.sfx.uiHover();
      menuBtn.setScale(0.85);
    });
    menuBtn.on('pointerout', () => menuBtn.setScale(0.8));
    menuBtn.on('pointerdown', () => {
      this.sfx.uiPress();
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.time.delayedCall(300, () => this.scene.start('MenuScene'));
    });

    // Entrance animation
    gameOverText.setScale(0);
    this.tweens.add({
      targets: gameOverText,
      scale: 1,
      duration: 500,
      ease: 'Back.easeOut',
    });

    this.cameras.main.fadeIn(400, 0, 0, 0);
  }
}
