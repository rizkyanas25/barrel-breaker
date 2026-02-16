import Phaser from 'phaser';
import { createProceduralSfx } from '../audio/sfx.js';
import { playGlobalBgm } from '../audio/bgm.js';
import { addAudioToggle } from '../audio/toggle.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
    this.loadingUi = null;
  }

  preload() {
    const { width, height } = this.scale;

    this._ensureGeneratedTextures();
    this._setupLoadingOverlay(width, height);
    this._queueCoreAssets();

    this.load.on('progress', (val) => {
      if (!this.loadingUi) return;

      this.loadingUi.fill.clear();
      this.loadingUi.fill.fillStyle(0xd4a94b, 1);
      this.loadingUi.fill.fillRoundedRect(
        this.loadingUi.barX + 4,
        this.loadingUi.barY + 4,
        (this.loadingUi.barW - 8) * val,
        this.loadingUi.barH - 8,
        8,
      );
      this.loadingUi.percent.setText(`${Math.round(val * 100)}%`);

      if (val > 0.2) this.loadingUi.status.setText('Loading character sprites');
      if (val > 0.5) this.loadingUi.status.setText('Preparing UI and scenes');
      if (val > 0.8) this.loadingUi.status.setText('Finalizing assets');
    });

    this.load.once('complete', () => {
      if (!this.loadingUi) return;
      this.loadingUi.percent.setText('100%');
      this.loadingUi.status.setText('Ready');
    });
  }

  create() {
    this._ensureAnimations();
    this.sfx = createProceduralSfx(this, { masterGain: 0.12 });
    this.events.once('shutdown', () => this.sfx?.destroy());
    playGlobalBgm(this, 'menu_bgm', { volume: 0.25 });

    const { width, height } = this.scale;
    const sidePad = 30;
    const contentW = width - sidePad * 2;
    const topPad = 24;
    const blockGap = 14;
    const buttonY = height - 84;
    const rulesBottomLimit = buttonY - 54;
    addAudioToggle(this, {
      x: width - 14,
      y: 14,
      depth: 1300,
      onUnmute: () => this.sfx.uiPress(),
    });

    const fitTextWidth = (textObj, maxWidth, minSize = 34) => {
      let size = parseInt(String(textObj.style.fontSize), 10) || 64;
      while (textObj.width > maxWidth && size > minSize) {
        size -= 1;
        textObj.setFontSize(size);
      }
    };

    this.add.image(width / 2, height / 2, 'bg_menu');

    const overlay = this.add.graphics();
    for (let y = 0; y < height; y++) {
      const alpha = Phaser.Math.Linear(0.12, 0.36, y / height);
      overlay.fillStyle(0x060b16, alpha);
      overlay.fillRect(0, y, width, 1);
    }

    const tagBg = this.add.graphics();
    tagBg.fillStyle(0x000000, 0.45);
    tagBg.fillRoundedRect(width / 2 - 96, topPad, 192, 28, 10);
    tagBg.lineStyle(1, 0xd4a94b, 0.46);
    tagBg.strokeRoundedRect(width / 2 - 96, topPad, 192, 28, 10);

    const tag = this.add
      .text(width / 2, topPad + 14, 'ONE PIECE ARCADE', {
        fontSize: '12px',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        color: '#d4a94b',
        letterSpacing: 1.1,
      })
      .setOrigin(0.5);

    const title = this.add
      .text(width / 2, topPad + 50, 'BARREL BREAKER', {
        fontSize: '72px',
        fontFamily: '"Georgia", serif',
        fontStyle: 'bold',
        color: '#ffd400',
        stroke: '#4a2800',
        strokeThickness: 7,
      })
      .setOrigin(0.5, 0);
    fitTextWidth(title, contentW);

    const subtitle = this.add
      .text(
        width / 2,
        title.y + title.height + 8,
        'Tap Fast, Avoid Bombs, Chase High Score',
        {
          fontSize: '16px',
          fontFamily: 'Arial',
          color: '#d6c8b5',
        },
      )
      .setOrigin(0.5, 0);

    const bestScore = localStorage.getItem('barrel_breaker_high') || '0';
    const bestBg = this.add.graphics();
    const bestY = subtitle.y + subtitle.height + 12;
    bestBg.fillStyle(0x000000, 0.55);
    bestBg.fillRoundedRect(width / 2 - 94, bestY, 188, 38, 10);
    bestBg.lineStyle(1, 0xd4a94b, 0.48);
    bestBg.strokeRoundedRect(width / 2 - 94, bestY, 188, 38, 10);
    const bestText = this.add
      .text(width / 2, bestY + 19, `BEST SCORE  ${bestScore}`, {
        fontSize: '17px',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        color: '#ffe39f',
      })
      .setOrigin(0.5);

    const heroY = bestY + 38 + blockGap;
    let heroH = 228;
    let rulesY = heroY + heroH + blockGap;
    let rulesH = 156;

    if (rulesY + rulesH > rulesBottomLimit) {
      const overflow = rulesY + rulesH - rulesBottomLimit;
      heroH = Math.max(196, heroH - overflow);
      rulesY = heroY + heroH + blockGap;
      rulesH = Math.max(138, rulesBottomLimit - rulesY);
    }

    const heroPanel = this.add.graphics();
    heroPanel.fillStyle(0x050915, 0.5);
    heroPanel.fillRoundedRect(sidePad, heroY, contentW, heroH, 14);
    heroPanel.lineStyle(1, 0xd4a94b, 0.26);
    heroPanel.strokeRoundedRect(sidePad, heroY, contentW, heroH, 14);

    const heroShadowY = heroY + heroH - 54;
    const heroShadow = this.add.ellipse(
      width / 2,
      heroShadowY,
      180,
      22,
      0x000000,
      0.3,
    );
    const luffyY = heroShadowY - 4;
    const luffy = this.add
      .sprite(width / 2, luffyY, 'luffy_standby')
      .setScale(2.9)
      .setOrigin(0.5, 1);
    luffy.play('luffy_menu_idle');

    this.tweens.add({
      targets: luffy,
      y: luffyY - 3,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const previewMeta = [
      { key: 'barrel_normal', label: '+10' },
      { key: 'barrel_gold', label: '+50' },
      { key: 'barrel_bomb', label: '-1 LIFE' },
      { key: 'barrel_time', label: '+5s' },
    ];
    const previewBarrels = [];
    const previewLabels = [];
    const previewY = heroY + heroH - 36;
    const spacing = contentW / (previewMeta.length + 1);

    previewMeta.forEach((item, i) => {
      const x = sidePad + spacing * (i + 1);
      const icon = this.add.image(x, previewY, item.key).setScale(0.47);
      const label = this.add
        .text(x, previewY + 23, item.label, {
          fontSize: '11px',
          fontFamily: 'Arial',
          fontStyle: 'bold',
          color: '#e5d6c2',
        })
        .setOrigin(0.5);

      previewBarrels.push(icon);
      previewLabels.push(label);

      this.tweens.add({
        targets: icon,
        y: previewY - 5,
        duration: 760 + i * 90,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });

    const rulesPanel = this.add.graphics();
    rulesPanel.fillStyle(0x000000, 0.56);
    rulesPanel.fillRoundedRect(sidePad, rulesY, contentW, rulesH, 14);
    rulesPanel.lineStyle(1, 0xd4a94b, 0.34);
    rulesPanel.strokeRoundedRect(sidePad, rulesY, contentW, rulesH, 14);

    const rulesTitle = this.add
      .text(width / 2, rulesY + 12, 'HOW TO PLAY', {
        fontSize: '12px',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        color: '#d4a94b',
        letterSpacing: 1.4,
      })
      .setOrigin(0.5, 0);

    const ruleItems = [
      { key: 'barrel_normal', label: 'Tap normal barrel for 10 points' },
      { key: 'barrel_gold', label: 'Tap gold barrel for 50 points' },
      { key: 'barrel_bomb', label: 'Avoid bomb barrel or lose one life' },
      { key: 'barrel_time', label: 'Blue barrel gives +5 seconds' },
    ];
    const ruleRows = [];
    const rowTop = rulesY + 40;
    const rowGap = 27;

    ruleItems.forEach((item, i) => {
      const y = rowTop + i * rowGap;
      const icon = this.add.image(sidePad + 22, y + 7, item.key).setScale(0.2);
      const text = this.add.text(sidePad + 54, y, item.label, {
        fontSize: '13px',
        fontFamily: 'Arial',
        color: '#e6d7c3',
      });
      ruleRows.push(icon, text);
    });

    const startGlow = this.add.ellipse(width / 2, buttonY, 236, 72, 0xd4a94b, 0.14);
    this.tweens.add({
      targets: startGlow,
      alpha: 0.24,
      duration: 840,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const startBtn = this.add
      .image(width / 2, buttonY, 'btn')
      .setScale(1.06)
      .setInteractive({ useHandCursor: true });
    const startText = this.add
      .text(width / 2, buttonY - 3, 'START GAME', {
        fontSize: '24px',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#4a2800',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    const hint = this.add
      .text(width / 2, buttonY + 41, 'Tap START to begin', {
        fontSize: '12px',
        fontFamily: 'Arial',
        color: '#c4b39c',
      })
      .setOrigin(0.5);

    let starting = false;
    const startGame = () => {
      if (starting) return;
      starting = true;
      startBtn.disableInteractive();
      this.sfx.uiConfirm();
      this.cameras.main.fadeOut(280, 0, 0, 0);
      this.time.delayedCall(280, () => this.scene.start('GameScene'));
    };

    startBtn.on('pointerover', () => {
      this.sfx.uiHover();
      startBtn.setScale(1.1);
      startText.setScale(1.03);
    });
    startBtn.on('pointerout', () => {
      startBtn.setScale(1.06);
      startText.setScale(1);
    });
    startBtn.on('pointerdown', () => {
      this.sfx.uiPress();
      startBtn.setScale(1.0);
      startText.setScale(0.98);
    });
    startBtn.on('pointerup', startGame);

    const headerItems = [tagBg, tag, title, subtitle, bestBg, bestText];
    const heroItems = [heroPanel, heroShadow, luffy, ...previewBarrels, ...previewLabels];
    const rulesItems = [rulesPanel, rulesTitle, ...ruleRows];
    const ctaItems = [startGlow, startBtn, startText, hint];

    [...headerItems, ...heroItems, ...rulesItems, ...ctaItems].forEach((item) =>
      item.setAlpha(0),
    );
    [tag, title, subtitle, bestText].forEach((item) => item.setY(item.y - 12));
    [rulesTitle, ...ruleRows, startBtn, startText, hint].forEach((item) =>
      item.setY(item.y + 12),
    );

    this.tweens.add({
      targets: headerItems,
      alpha: 1,
      duration: 320,
      delay: 30,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: [tag, title, subtitle, bestText],
          y: '+=12',
          duration: 260,
          ease: 'Back.easeOut',
        });
      },
    });

    this.tweens.add({
      targets: heroItems,
      alpha: 1,
      duration: 320,
      delay: 150,
      ease: 'Sine.easeOut',
    });

    this.tweens.add({
      targets: rulesItems,
      alpha: 1,
      duration: 320,
      delay: 250,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: [rulesTitle, ...ruleRows],
          y: '-=12',
          duration: 260,
          ease: 'Back.easeOut',
        });
      },
    });

    this.tweens.add({
      targets: ctaItems,
      alpha: 1,
      duration: 320,
      delay: 340,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: [startBtn, startText, hint],
          y: '-=12',
          duration: 260,
          ease: 'Back.easeOut',
        });
      },
    });

    this.time.delayedCall(80, () => this._hideLoadingOverlay());
    this.cameras.main.fadeIn(280, 0, 0, 0);
  }

  _setupLoadingOverlay(width, height) {
    const barW = 300;
    const barH = 22;
    const barX = (width - barW) / 2;
    const barY = height * 0.63;

    const scrim = this.add
      .rectangle(width / 2, height / 2, width, height, 0x02040a, 0.82)
      .setDepth(2000);

    const panel = this.add.graphics().setDepth(2001);
    panel.fillStyle(0x000000, 0.62);
    panel.fillRoundedRect(width / 2 - 178, height / 2 - 134, 356, 268, 14);
    panel.lineStyle(1, 0xd4a94b, 0.45);
    panel.strokeRoundedRect(width / 2 - 178, height / 2 - 134, 356, 268, 14);

    const title = this.add
      .text(width / 2, height / 2 - 88, 'BARREL BREAKER', {
        fontSize: '42px',
        fontFamily: '"Georgia", serif',
        fontStyle: 'bold',
        color: '#ffd400',
        stroke: '#4a2800',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(2002);

    const subtitle = this.add
      .text(width / 2, height / 2 - 30, 'Loading menu resources', {
        fontSize: '14px',
        fontFamily: 'Arial',
        color: '#d6c8b5',
      })
      .setOrigin(0.5)
      .setDepth(2002);

    const frame = this.add.graphics().setDepth(2002);
    frame.fillStyle(0x17100a, 0.95);
    frame.fillRoundedRect(barX, barY, barW, barH, 9);
    frame.lineStyle(2, 0xd4a94b, 0.62);
    frame.strokeRoundedRect(barX, barY, barW, barH, 9);

    const fill = this.add.graphics().setDepth(2003);

    const percent = this.add
      .text(width / 2, barY + 34, '0%', {
        fontSize: '20px',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        color: '#ffe39f',
      })
      .setOrigin(0.5)
      .setDepth(2002);

    const status = this.add
      .text(width / 2, barY + 66, 'Initializing', {
        fontSize: '12px',
        fontFamily: 'Arial',
        color: '#c4b39c',
      })
      .setOrigin(0.5)
      .setDepth(2002);

    this.loadingUi = {
      items: [scrim, panel, title, subtitle, frame, fill, percent, status],
      barX,
      barY,
      barW,
      barH,
      fill,
      percent,
      status,
    };
  }

  _queueCoreAssets() {
    if (!this.textures.exists('luffy_idle')) {
      this.load.spritesheet('luffy_idle', 'assets/luffy_idle.png', {
        frameWidth: 48,
        frameHeight: 64,
      });
    }

    if (!this.textures.exists('luffy_standby')) {
      this.load.spritesheet('luffy_standby', 'assets/luffy_standby.png', {
        frameWidth: 41,
        frameHeight: 64,
        spacing: 1,
      });
    }

    if (!this.textures.exists('luffy_punch_jump')) {
      this.load.spritesheet('luffy_punch_jump', 'assets/luffy_punch_jump.png', {
        frameWidth: 47,
        frameHeight: 97,
      });
    }

    if (!this.textures.exists('luffy_portrait')) {
      this.load.image('luffy_portrait', 'assets/luffy_portrait.png');
    }

    if (!this.textures.exists('luffy_win')) {
      this.load.spritesheet('luffy_win', 'assets/luffy_win.png', {
        frameWidth: 36,
        frameHeight: 57,
      });
    }

    if (!this.textures.exists('luffy_lose')) {
      this.load.spritesheet('luffy_lose', 'assets/luffy_lose.png', {
        frameWidth: 35,
        frameHeight: 47,
        spacing: 1,
      });
    }

    if (!this.textures.exists('luffy_death')) {
      this.load.spritesheet('luffy_death', 'assets/luffy_death.png', {
        frameWidth: 56,
        frameHeight: 56,
      });
    }

    if (!this.cache.audio.exists('menu_bgm')) {
      this.load.audio('menu_bgm', 'menu_bgm.mp3');
    }

    if (!this.cache.audio.exists('game_bgm')) {
      this.load.audio('game_bgm', 'game_bgm.mp3');
    }
  }

  _ensureAnimations() {
    if (!this.anims.exists('luffy_walk')) {
      this.anims.create({
        key: 'luffy_walk',
        frames: this.anims.generateFrameNumbers('luffy_idle', {
          start: 0,
          end: 6,
        }),
        frameRate: 10,
        repeat: -1,
      });
    }

    if (!this.anims.exists('luffy_menu_idle')) {
      this.anims.create({
        key: 'luffy_menu_idle',
        frames: this.anims.generateFrameNumbers('luffy_standby', {
          start: 0,
          end: 1,
        }),
        frameRate: 3,
        repeat: -1,
      });
    }

    if (!this.anims.exists('luffy_attack_jump')) {
      this.anims.create({
        key: 'luffy_attack_jump',
        frames: this.anims.generateFrameNumbers('luffy_punch_jump', {
          start: 0,
          end: 4,
        }),
        frameRate: 12,
        repeat: 0,
      });
    }

    if (!this.anims.exists('luffy_win_celebrate')) {
      this.anims.create({
        key: 'luffy_win_celebrate',
        frames: this.anims.generateFrameNumbers('luffy_win', {
          start: 0,
          end: 7,
        }),
        frameRate: 10,
        repeat: -1,
      });
    }

    if (!this.anims.exists('luffy_lose_loop')) {
      this.anims.create({
        key: 'luffy_lose_loop',
        frames: this.anims.generateFrameNumbers('luffy_lose', {
          start: 0,
          end: 6,
        }),
        frameRate: 8,
        repeat: -1,
      });
    }

    if (!this.anims.exists('luffy_death_fall')) {
      this.anims.create({
        key: 'luffy_death_fall',
        frames: this.anims.generateFrameNumbers('luffy_death', {
          start: 0,
          end: 1,
        }),
        frameRate: 4,
        repeat: 0,
      });
    }
  }

  _hideLoadingOverlay() {
    if (!this.loadingUi) return;

    this.tweens.add({
      targets: this.loadingUi.items,
      alpha: 0,
      duration: 220,
      onComplete: () => {
        this.loadingUi.items.forEach((item) => item.destroy());
        this.loadingUi = null;
      },
    });
  }

  _ensureGeneratedTextures() {
    const missing =
      !this.textures.exists('bg_menu') ||
      !this.textures.exists('bg_deck') ||
      !this.textures.exists('barrel_normal') ||
      !this.textures.exists('barrel_gold') ||
      !this.textures.exists('barrel_bomb') ||
      !this.textures.exists('barrel_time') ||
      !this.textures.exists('heart') ||
      !this.textures.exists('heart_empty') ||
      !this.textures.exists('particle') ||
      !this.textures.exists('particle_white') ||
      !this.textures.exists('btn');

    if (missing) {
      this._generateTextures();
    }
  }

  _generateTextures() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    // Normal barrel
    this._drawBarrel(g, 0x8b5e3c, 0x6b3f1f, 0xa0724b);
    g.generateTexture('barrel_normal', 80, 90);
    g.clear();

    // Gold barrel
    this._drawBarrel(g, 0xdaa520, 0xb8860b, 0xffd700);
    g.generateTexture('barrel_gold', 80, 90);
    g.clear();

    // Bomb barrel
    this._drawBarrel(g, 0x2c2c2c, 0x1a1a1a, 0x444444);
    g.fillStyle(0xff4444, 1);
    g.fillCircle(40, 38, 12);
    g.fillStyle(0x2c2c2c, 1);
    g.fillCircle(34, 35, 4);
    g.fillCircle(46, 35, 4);
    g.fillRect(35, 44, 10, 4);
    g.generateTexture('barrel_bomb', 80, 90);
    g.clear();

    // Time barrel
    this._drawBarrel(g, 0x2e86c1, 0x1b5e8c, 0x5dade2);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(40, 40, 12);
    g.fillStyle(0x2e86c1, 1);
    g.fillCircle(40, 40, 9);
    g.fillStyle(0xffffff, 1);
    g.fillRect(39, 33, 2, 9);
    g.fillRect(39, 40, 7, 2);
    g.generateTexture('barrel_time', 80, 90);
    g.clear();

    // Particles
    g.fillStyle(0xd4a94b, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('particle', 8, 8);
    g.clear();

    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('particle_white', 8, 8);
    g.clear();

    // Hearts
    g.fillStyle(0xff4444, 1);
    g.fillCircle(10, 8, 7);
    g.fillCircle(20, 8, 7);
    g.fillTriangle(3, 10, 27, 10, 15, 25);
    g.generateTexture('heart', 30, 28);
    g.clear();

    g.lineStyle(2, 0xff4444, 0.5);
    g.strokeCircle(10, 8, 7);
    g.strokeCircle(20, 8, 7);
    g.lineBetween(3, 10, 15, 25);
    g.lineBetween(27, 10, 15, 25);
    g.generateTexture('heart_empty', 30, 28);
    g.clear();

    // Gameplay background
    const bgG = this.make.graphics({ x: 0, y: 0, add: false });
    const oceanH = 160;
    for (let y = 0; y < oceanH; y++) {
      const t = y / oceanH;
      const r = Math.floor(8 + t * 15);
      const gv = Math.floor(25 + t * 35);
      const b = Math.floor(60 + t * 40);
      bgG.fillStyle((r << 16) | (gv << 8) | b, 1);
      bgG.fillRect(0, y, 480, 1);
    }

    for (let i = 0; i < 5; i++) {
      bgG.fillStyle(0xffffff, 0.08);
      const waveY = 40 + i * 30;
      for (let x = 0; x < 480; x += 2) {
        const wy = waveY + Math.sin(x * 0.03 + i * 1.5) * 5;
        bgG.fillRect(x, wy, 2, 2);
      }
    }

    bgG.fillStyle(0x3d2415, 1);
    bgG.fillRect(0, oceanH - 8, 480, 16);
    bgG.fillStyle(0x5c3a20, 1);
    bgG.fillRect(0, oceanH - 8, 480, 4);
    for (let x = 30; x < 480; x += 60) {
      bgG.fillStyle(0x5c3a20, 1);
      bgG.fillRect(x, oceanH - 28, 8, 28);
      bgG.fillStyle(0x7a5030, 1);
      bgG.fillRect(x, oceanH - 28, 8, 3);
    }

    for (let x = 30; x < 450; x += 60) {
      for (let px = 0; px < 60; px += 2) {
        const rx = x + 4 + px;
        const ry = oceanH - 18 + Math.sin(px * 0.1) * 4;
        bgG.fillStyle(0x8b7355, 0.6);
        bgG.fillRect(rx, ry, 2, 2);
      }
    }

    for (let y = oceanH + 8; y < 854; y += 55) {
      const plankShade = y % 110 === 0 ? 0x30200f : 0x2a1a0a;
      bgG.fillStyle(plankShade, 1);
      bgG.fillRect(0, y, 480, 53);

      bgG.lineStyle(1, 0x1a0e05, 0.25);
      bgG.lineBetween(0, y + 53, 480, y + 53);
      for (let gx = 0; gx < 480; gx += Phaser.Math.Between(80, 160)) {
        bgG.lineStyle(1, 0x1a0e05, 0.1);
        bgG.lineBetween(gx, y, gx, y + 53);
      }

      if (y % 110 === 0) {
        bgG.fillStyle(0x3a2815, 0.15);
        bgG.fillCircle(100 + (y % 200), y + 25, 6);
        bgG.fillCircle(350 - (y % 150), y + 30, 5);
      }
    }

    bgG.lineStyle(3, 0x8b7355, 0.3);
    bgG.strokeCircle(35, 810, 18);
    bgG.strokeCircle(35, 810, 12);
    bgG.strokeCircle(445, 810, 15);
    bgG.strokeCircle(445, 810, 10);
    bgG.generateTexture('bg_deck', 480, 854);
    bgG.destroy();

    // Menu background
    const menuG = this.make.graphics({ x: 0, y: 0, add: false });
    for (let y = 0; y < 854; y++) {
      const t = y / 854;
      const r = Math.floor(5 + t * 15);
      const gv = Math.floor(5 + t * 10);
      const b = Math.floor(20 + t * 30);
      menuG.fillStyle((r << 16) | (gv << 8) | b, 1);
      menuG.fillRect(0, y, 480, 1);
    }

    for (let i = 0; i < 40; i++) {
      const sx = Phaser.Math.Between(10, 470);
      const sy = Phaser.Math.Between(10, 300);
      const size = Phaser.Math.Between(1, 3);
      menuG.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.2, 0.6));
      menuG.fillRect(sx, sy, size, size);
    }

    menuG.fillStyle(0xfff8dc, 0.15);
    menuG.fillCircle(380, 80, 50);
    menuG.fillStyle(0xfff8dc, 0.25);
    menuG.fillCircle(380, 80, 35);
    menuG.fillStyle(0xfff8dc, 0.08);
    menuG.fillCircle(380, 80, 70);

    for (let y = 550; y < 854; y++) {
      const t = (y - 550) / 304;
      const r = Math.floor(5 + t * 8);
      const gv = Math.floor(15 + t * 25);
      const b = Math.floor(40 + t * 50);
      menuG.fillStyle((r << 16) | (gv << 8) | b, 1);
      menuG.fillRect(0, y, 480, 1);
    }

    for (let y = 560; y < 800; y += 3) {
      const rw = Math.max(2, 40 - (y - 560) * 0.15);
      menuG.fillStyle(0xfff8dc, 0.05);
      menuG.fillRect(370 - rw / 2, y, rw, 2);
    }

    for (let i = 0; i < 4; i++) {
      menuG.fillStyle(0xffffff, 0.04);
      const waveY = 570 + i * 40;
      for (let x = 0; x < 480; x += 2) {
        const wy = waveY + Math.sin(x * 0.025 + i * 2) * 6;
        menuG.fillRect(x, wy, 2, 2);
      }
    }

    const jrX = 240;
    const jrY = 420;
    menuG.fillStyle(0xffffff, 0.12);
    menuG.fillCircle(jrX, jrY, 45);
    menuG.fillStyle(0x000000, 0.3);
    menuG.fillCircle(jrX - 15, jrY + 2, 8);
    menuG.fillCircle(jrX + 15, jrY + 2, 8);
    menuG.lineStyle(3, 0x000000, 0.3);
    menuG.beginPath();
    menuG.arc(jrX, jrY + 5, 20, 0.2, Math.PI - 0.2, false);
    menuG.strokePath();
    menuG.fillStyle(0xdaa520, 0.2);
    menuG.fillEllipse(jrX, jrY - 35, 70, 20);
    menuG.fillRoundedRect(jrX - 25, jrY - 48, 50, 20, 8);
    menuG.fillStyle(0xcc3333, 0.15);
    menuG.fillRect(jrX - 25, jrY - 33, 50, 4);
    menuG.lineStyle(6, 0xffffff, 0.1);
    menuG.lineBetween(jrX - 50, jrY + 30, jrX + 50, jrY + 70);
    menuG.lineBetween(jrX + 50, jrY + 30, jrX - 50, jrY + 70);

    menuG.fillStyle(0x000000, 0.3);
    menuG.fillTriangle(80, 700, 400, 700, 350, 750);
    menuG.fillRect(120, 700, 230, 50);
    menuG.fillRect(230, 560, 6, 140);
    menuG.fillStyle(0x000000, 0.2);
    menuG.fillTriangle(180, 580, 236, 560, 236, 680);
    menuG.generateTexture('bg_menu', 480, 854);
    menuG.destroy();

    // Generic button
    g.fillStyle(0xd4a94b, 1);
    g.fillRoundedRect(0, 0, 220, 60, 12);
    g.fillStyle(0xb8860b, 1);
    g.fillRoundedRect(0, 50, 220, 10, { tl: 0, tr: 0, bl: 12, br: 12 });
    g.generateTexture('btn', 220, 60);
    g.clear();
    g.destroy();
  }

  _drawBarrel(g, bodyColor, darkColor, lightColor) {
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(42, 85, 70, 16);
    g.fillStyle(bodyColor, 1);
    g.fillRoundedRect(8, 10, 64, 70, 6);
    g.fillStyle(lightColor, 1);
    g.fillEllipse(40, 12, 64, 14);
    g.fillStyle(darkColor, 1);
    g.fillRect(8, 25, 64, 6);
    g.fillRect(8, 55, 64, 6);
    g.fillStyle(lightColor, 0.3);
    g.fillRect(18, 12, 8, 68);
  }
}
