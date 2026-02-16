import Phaser from 'phaser';
import { createProceduralSfx } from '../audio/sfx.js';
import { playGlobalBgm } from '../audio/bgm.js';
import { addAudioToggle } from '../audio/toggle.js';

const BARREL_TYPES = {
  normal: { key: 'barrel_normal', points: 10, weight: 60 },
  gold: { key: 'barrel_gold', points: 50, weight: 10 },
  bomb: { key: 'barrel_bomb', points: -1, weight: 25 },
  time: { key: 'barrel_time', points: 5, weight: 5 },
};

const GAME_DURATION = 60;
const SPAWN_AREA = { x: 60, y: 140, w: 360, h: 540 };
const BASE_SPAWN_INTERVAL = 1000;
const MIN_SPAWN_INTERVAL = 350;
const BARREL_LIFETIME = 2200;
const BARREL_STACK_X_TOLERANCE = 26;
const BARREL_STACK_Y_MIN_OFFSET = 6;
const BARREL_STACK_Y_MAX_GAP = 180;

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  init() {
    this.score = 0;
    this.lives = 3;
    this.timeLeft = GAME_DURATION;
    this.combo = 0;
    this.maxCombo = 0;
    this.difficulty = 1;
    this.barrelsSmashed = 0;
    this.isGameOver = false;
    this.spawnInterval = BASE_SPAWN_INTERVAL;
    this.lastClickX = null;
    this.luffyMoveTween = null;
    this.attackResetTimer = null;
    this.gameOverReason = 'timeout';
    this.isDeathSequencePlaying = false;
  }

  create() {
    const { width, height } = this.scale;
    this.sfx = createProceduralSfx(this, { masterGain: 0.14 });
    this.events.once('shutdown', () => this.sfx?.destroy());
    playGlobalBgm(this, 'game_bgm', { volume: 0.22 });

    // Background
    this.add.image(width / 2, height / 2, 'bg_deck');

    // ── HUD ──
    this._createHUD(width);
    addAudioToggle(this, {
      x: width - 14,
      y: 68,
      depth: 30,
      onUnmute: () => this.sfx.uiPress(),
    });

    this.luffyGroundY = height - 56;

    // ── Luffy character (tracks click position horizontally) ──
    this.luffy = this.add
      .sprite(width / 2, this.luffyGroundY, 'luffy_idle')
      .setScale(2.3)
      .setOrigin(0.5, 1);
    this.luffy.play('luffy_walk');
    this.luffy.setDepth(10);
    this.lastClickX = this.luffy.x;

    // Speech bubble (for reactions)
    this.speechBubble = this.add
      .text(this.luffy.x, this.luffyGroundY - 86, '', {
        fontSize: '12px',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        color: '#FFFFFF',
        backgroundColor: '#000000aa',
        padding: { x: 7, y: 4 },
      })
      .setOrigin(0.5, 1)
      .setAlpha(0)
      .setDepth(11);

    // Track click position: Luffy slides on X to the latest tap/click
    this.input.on('pointerdown', (pointer) => {
      if (this.isGameOver) return;
      this._moveLuffyTo(pointer.x);
    });

    // ── Barrel pool ──
    this.barrels = this.add.group();

    // ── Spawn timer ──
    this.spawnTimer = this.time.addEvent({
      delay: this.spawnInterval,
      callback: this._spawnBarrel,
      callbackScope: this,
      loop: true,
    });

    // ── Countdown timer ──
    this.countdownTimer = this.time.addEvent({
      delay: 1000,
      callback: this._tick,
      callbackScope: this,
      loop: true,
    });

    // ── Difficulty escalation ──
    this.time.addEvent({
      delay: 10000,
      callback: this._increaseDifficulty,
      callbackScope: this,
      loop: true,
    });

    // ── Particle emitters ──
    this.burstEmitter = this.add.particles(0, 0, 'particle', {
      speed: { min: 80, max: 200 },
      scale: { start: 1.2, end: 0 },
      lifespan: 500,
      gravityY: 300,
      emitting: false,
    });

    this.sparkEmitter = this.add.particles(0, 0, 'particle_white', {
      speed: { min: 50, max: 150 },
      scale: { start: 0.8, end: 0 },
      lifespan: 400,
      emitting: false,
    });

    // Ready-go animation
    this._showReadyGo(width, height);

    this.cameras.main.fadeIn(300, 0, 0, 0);
  }

  // ─── HUD ─────────────────────────────────────
  _createHUD(width) {
    const topBar = this.add.graphics();
    topBar.fillStyle(0x000000, 0.6);
    topBar.fillRect(0, 0, width, 102);
    topBar.lineStyle(2, 0xd4a94b, 0.4);
    topBar.lineBetween(0, 102, width, 102);

    this.add.text(16, 16, 'SCORE', {
      fontSize: '13px',
      fontFamily: 'Arial',
      color: '#D4A94B',
    });
    this.scoreText = this.add.text(16, 34, '0', {
      fontSize: '30px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      color: '#FFFFFF',
    });

    this.add
      .text(width - 20, 18, 'TIME', {
        fontSize: '13px',
        fontFamily: 'Arial',
        color: '#D4A94B',
      })
      .setOrigin(1, 0);
    this.timerText = this.add
      .text(width - 20, 34, `${GAME_DURATION}`, {
        fontSize: '30px',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        color: '#FFFFFF',
      })
      .setOrigin(1, 0);

    // Lives (hearts)
    this.heartIcons = [];
    for (let i = 0; i < 3; i++) {
      const heart = this.add
        .image(16 + i * 34, 78, 'heart')
        .setOrigin(0, 0.5)
        .setScale(0.85);
      this.heartIcons.push(heart);
    }

    // Combo display
    this.comboText = this.add
      .text(width / 2, 74, '', {
        fontSize: '17px',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        color: '#FFD700',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setAlpha(0);

    // Bottom bar
    const bottomBar = this.add.graphics();
    bottomBar.fillStyle(0x000000, 0.42);
    bottomBar.fillRect(0, this.scale.height - 42, width, 42);
    bottomBar.lineStyle(2, 0xd4a94b, 0.3);
    bottomBar.lineBetween(
      0,
      this.scale.height - 42,
      width,
      this.scale.height - 42,
    );

    this.barrelCountText = this.add
      .text(width / 2, this.scale.height - 21, 'Barrels: 0', {
        fontSize: '14px',
        fontFamily: 'Arial',
        color: '#CCBBAA',
      })
      .setOrigin(0.5);
  }

  // ─── Luffy Reactions ─────────────────────────
  _luffyReact(type) {
    const reactions = {
      hit: ['Nice', 'Good hit', 'Keep going'],
      gold: ['Gold barrel', 'Big points', 'Great'],
      bomb: ['Ouch', 'Watch out', 'Bomb'],
      time: ['Extra time', 'Lucky', 'Nice'],
      combo: ['Combo', 'On fire', 'Clean run'],
    };

    const msgs = reactions[type] || reactions.hit;
    const msg = msgs[Phaser.Math.Between(0, msgs.length - 1)];

    if (type === 'bomb') {
      this._playDamageFeedback();
    } else {
      this._playAttackFeedback();
    }

    // Show speech bubble
    this.speechBubble.setText(msg);
    this.speechBubble.setX(this.luffy.x);
    this.speechBubble.setAlpha(1);
    this.tweens.killTweensOf(this.speechBubble);
    this.tweens.add({
      targets: this.speechBubble,
      alpha: 0,
      duration: 500,
      delay: 420,
    });
  }

  _playAttackFeedback() {
    if (this.attackResetTimer) {
      this.attackResetTimer.remove();
      this.attackResetTimer = null;
    }

    this.luffy.play('luffy_attack_jump', true);

    this.attackResetTimer = this.time.delayedCall(360, () => {
      if (!this.luffy.active) return;
      this.luffy.setX(this.lastClickX ?? this.luffy.x);
      this.speechBubble.setX(this.luffy.x);
      this.luffy.play('luffy_walk', true);
      this.attackResetTimer = null;
    });
  }

  _playDamageFeedback() {
    const baseX = this.lastClickX ?? this.luffy.x;

    if (this.attackResetTimer) {
      this.attackResetTimer.remove();
      this.attackResetTimer = null;
    }

    this.luffy.setX(baseX);
    this.luffy.setTint(0xff8888);
    if (this.luffyMoveTween) {
      this.luffyMoveTween.stop();
      this.luffyMoveTween = null;
    }
    this.tweens.killTweensOf(this.luffy);
    this.tweens.add({
      targets: this.luffy,
      x: baseX + 5,
      yoyo: true,
      repeat: 2,
      duration: 60,
      onUpdate: () => {
        this.speechBubble.setX(this.luffy.x);
      },
      onComplete: () => {
        this.luffy.setX(baseX);
        this.speechBubble.setX(baseX);
        this.luffy.clearTint();
        this.luffy.play('luffy_walk');
      },
    });
  }

  _playLuffyDeath() {
    if (this.isDeathSequencePlaying) return;
    this.isDeathSequencePlaying = true;

    if (this.attackResetTimer) {
      this.attackResetTimer.remove();
      this.attackResetTimer = null;
    }

    if (this.luffyMoveTween) {
      this.luffyMoveTween.stop();
      this.luffyMoveTween = null;
    }

    this.tweens.killTweensOf(this.luffy);
    this.luffy.clearTint();
    this.luffy.setX(this.lastClickX ?? this.luffy.x);
    this.speechBubble.setAlpha(0);
    this.speechBubble.setX(this.luffy.x);

    if (this.anims.exists('luffy_death_fall') && this.textures.exists('luffy_death')) {
      this.luffy
        .setTexture('luffy_death')
        .setScale(2.2)
        .setOrigin(0.5, 1)
        .setY(this.luffyGroundY + 4);
      this.luffy.play('luffy_death_fall', true);
      return;
    }

    this.luffy.setTint(0xaa4444);
  }

  _moveLuffyTo(pointerX, instant = false) {
    const minX = 42;
    const maxX = this.scale.width - 42;
    const targetX = Phaser.Math.Clamp(pointerX, minX, maxX);
    this.lastClickX = targetX;

    if (instant) {
      this.luffy.setX(targetX);
      this.speechBubble.setX(targetX);
      return;
    }

    if (this.luffyMoveTween) {
      this.luffyMoveTween.stop();
      this.luffyMoveTween = null;
    }

    const distance = Math.abs(targetX - this.luffy.x);
    const duration = Phaser.Math.Clamp(80 + distance * 2.2, 90, 260);

    this.luffyMoveTween = this.tweens.add({
      targets: this.luffy,
      x: targetX,
      duration,
      ease: 'Sine.easeOut',
      onUpdate: () => {
        this.speechBubble.setX(this.luffy.x);
      },
      onComplete: () => {
        this.speechBubble.setX(targetX);
        this.luffyMoveTween = null;
      },
    });
  }

  // ─── Spawn ───────────────────────────────────
  _spawnBarrel() {
    if (this.isGameOver) return;

    const type = this._getRandomBarrelType();
    const barrelData = BARREL_TYPES[type];

    const x = Phaser.Math.Between(SPAWN_AREA.x, SPAWN_AREA.x + SPAWN_AREA.w);
    const y = Phaser.Math.Between(SPAWN_AREA.y, SPAWN_AREA.y + SPAWN_AREA.h);

    const barrel = this.add
      .image(x, y - 14, barrelData.key)
      .setScale(0)
      .setInteractive({ useHandCursor: true })
      .setData('type', type)
      .setData('points', barrelData.points);

    this.barrels.add(barrel);

    this.tweens.add({
      targets: barrel,
      y,
      scale: 0.85,
      duration: 170,
      ease: 'Back.easeOut',
    });

    const lifetime = BARREL_LIFETIME - this.difficulty * 100;
    this.time.delayedCall(Math.max(lifetime, 800), () => {
      if (barrel.active) {
        this._despawnBarrel(barrel);
      }
    });

    barrel.on('pointerdown', () => {
      this._onBarrelTapped(barrel);
    });
  }

  _getRandomBarrelType() {
    const adjustedTypes = { ...BARREL_TYPES };
    adjustedTypes.bomb = {
      ...adjustedTypes.bomb,
      weight: adjustedTypes.bomb.weight + this.difficulty * 3,
    };

    const adjustedTotal = Object.values(adjustedTypes).reduce(
      (sum, t) => sum + t.weight,
      0,
    );
    let roll = Phaser.Math.Between(1, adjustedTotal);

    for (const [name, data] of Object.entries(adjustedTypes)) {
      roll -= data.weight;
      if (roll <= 0) return name;
    }
    return 'normal';
  }

  // ─── Barrel Interaction ──────────────────────
  _onBarrelTapped(barrel, allowRedirect = true) {
    if (this.isGameOver || !barrel.active) return;

    if (allowRedirect) {
      const strikeTarget = this._getLowerPriorityBarrel(barrel);
      if (strikeTarget && strikeTarget !== barrel) {
        this._onBarrelTapped(strikeTarget, false);
        return;
      }
    }

    const type = barrel.getData('type');
    const x = barrel.x;
    const y = barrel.y;

    this._moveLuffyTo(x);

    barrel.disableInteractive();

    if (type === 'bomb') {
      this._onBombHit(barrel);
    } else if (type === 'time') {
      this._onTimeHit(barrel, x, y);
    } else {
      this._onNormalHit(barrel, type, x, y);
    }
  }

  _getLowerPriorityBarrel(selectedBarrel) {
    const candidates = this.barrels
      .getChildren()
      .filter((candidate) => {
        if (!candidate || candidate === selectedBarrel) return false;
        if (!candidate.active) return false;
        if (!candidate.input?.enabled) return false;

        const sameColumn =
          Math.abs(candidate.x - selectedBarrel.x) <= BARREL_STACK_X_TOLERANCE;
        const yDiff = candidate.y - selectedBarrel.y;
        const isBelow =
          yDiff >= BARREL_STACK_Y_MIN_OFFSET && yDiff <= BARREL_STACK_Y_MAX_GAP;

        return sameColumn && isBelow;
      });

    if (candidates.length === 0) return selectedBarrel;

    return candidates.reduce((lowest, candidate) =>
      candidate.y > lowest.y ? candidate : lowest,
    );
  }

  _onNormalHit(barrel, type, x, y) {
    const points = barrel.getData('points');
    this.combo++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    this.barrelsSmashed++;

    const comboMultiplier = this.combo >= 10 ? 3 : this.combo >= 5 ? 2 : 1;
    const finalPoints = points * comboMultiplier;

    this.score += finalPoints;
    this.scoreText.setText(String(this.score));
    this.barrelCountText.setText(`Barrels: ${this.barrelsSmashed}`);

    const color = type === 'gold' ? '#FFD700' : '#FFFFFF';
    const popupText =
      comboMultiplier > 1
        ? `+${finalPoints} x${comboMultiplier}`
        : `+${finalPoints}`;
    this._showPopup(x, y - 30, popupText, color);

    if (type === 'gold') {
      this.sfx.gold();
    } else if (this.combo >= 5) {
      this.sfx.combo();
    } else {
      this.sfx.hit();
    }

    if (this.combo >= 3) {
      this.comboText.setText(`${this.combo} COMBO!`);
      this.comboText.setAlpha(1);
      this.tweens.add({
        targets: this.comboText,
        alpha: 0,
        duration: 800,
        ease: 'Power2',
      });
    }

    // Luffy reaction on every successful barrel hit
    this._luffyReact(type === 'gold' ? 'gold' : this.combo >= 5 ? 'combo' : 'hit');

    const tint = type === 'gold' ? 0xffd700 : 0xd4a94b;
    this.burstEmitter.setParticleTint(tint);
    this.burstEmitter.emitParticleAt(x, y, 12);

    this.tweens.add({
      targets: barrel,
      scale: 1.3,
      alpha: 0,
      angle: Phaser.Math.Between(-30, 30),
      duration: 200,
      ease: 'Power2',
      onComplete: () => barrel.destroy(),
    });

    this.tweens.add({
      targets: this.scoreText,
      scale: 1.2,
      duration: 100,
      yoyo: true,
      ease: 'Sine.easeOut',
    });
  }

  _onBombHit(barrel) {
    this.lives--;
    this.combo = 0;
    this.sfx.bomb();

    const isFinalHit = this.lives <= 0;
    if (isFinalHit) {
      this._playLuffyDeath();
    } else {
      // Luffy reacts to bomb
      this._luffyReact('bomb');
    }

    if (this.lives >= 0 && this.heartIcons[this.lives]) {
      this.tweens.add({
        targets: this.heartIcons[this.lives],
        scale: 1.5,
        alpha: 0,
        duration: 300,
        onComplete: () => {
          this.heartIcons[this.lives]
            ?.setTexture('heart_empty')
            .setAlpha(0.5)
            .setScale(0.9);
        },
      });
    }

    this.cameras.main.shake(200, 0.015);
    this.cameras.main.flash(200, 255, 50, 50, false);

    this._showPopup(barrel.x, barrel.y - 30, 'BOMB', '#FF4444');

    this.burstEmitter.setParticleTint(0xff4444);
    this.burstEmitter.emitParticleAt(barrel.x, barrel.y, 20);
    this.sparkEmitter.emitParticleAt(barrel.x, barrel.y, 8);

    this.tweens.add({
      targets: barrel,
      scale: 1.8,
      alpha: 0,
      duration: 250,
      ease: 'Power3',
      onComplete: () => barrel.destroy(),
    });

    if (isFinalHit) {
      this.gameOverReason = 'health';
      this._gameOver('health', 620);
    }
  }

  _onTimeHit(barrel, x, y) {
    this.timeLeft += 5;
    this.combo++;
    this.barrelsSmashed++;
    this.barrelCountText.setText(`Barrels: ${this.barrelsSmashed}`);
    this.sfx.timeBonus();

    this.timerText.setText(String(this.timeLeft));
    this._showPopup(x, y - 30, '+5s', '#5DADE2');
    this._luffyReact('time');

    this.sparkEmitter.emitParticleAt(x, y, 10);

    this.tweens.add({
      targets: this.timerText,
      scale: 1.3,
      duration: 150,
      yoyo: true,
    });

    this.tweens.add({
      targets: barrel,
      scale: 1.2,
      alpha: 0,
      duration: 200,
      onComplete: () => barrel.destroy(),
    });
  }

  _despawnBarrel(barrel) {
    if (!barrel.active) return;
    this.tweens.killTweensOf(barrel);
    this.tweens.add({
      targets: barrel,
      scale: 0,
      alpha: 0,
      duration: 200,
      ease: 'Back.easeIn',
      onComplete: () => barrel.destroy(),
    });
  }

  // ─── UI Helpers ──────────────────────────────
  _showPopup(x, y, text, color) {
    const popup = this.add
      .text(x, y, text, {
        fontSize: '24px',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        color: color,
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: popup,
      y: y - 50,
      alpha: 0,
      duration: 700,
      ease: 'Power2',
      onComplete: () => popup.destroy(),
    });
  }

  _showReadyGo(width, height) {
    this.sfx.ready();

    const readyText = this.add
      .text(width / 2, height / 2, 'READY?', {
        fontSize: '48px',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        color: '#FFD700',
        stroke: '#000000',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setScale(0);

    this.tweens.add({
      targets: readyText,
      scale: 1,
      duration: 400,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.time.delayedCall(500, () => {
          this.sfx.go();
          readyText.setText('GO!');
          this.tweens.add({
            targets: readyText,
            scale: 2,
            alpha: 0,
            duration: 400,
            ease: 'Power2',
            onComplete: () => readyText.destroy(),
          });
        });
      },
    });
  }

  // ─── Timer ───────────────────────────────────
  _tick() {
    if (this.isGameOver) return;

    this.timeLeft--;
    this.timerText.setText(String(Math.max(0, this.timeLeft)));

    if (this.timeLeft <= 10) {
      this.timerText.setColor('#FF4444');
      this.tweens.add({
        targets: this.timerText,
        scale: 1.15,
        duration: 100,
        yoyo: true,
      });
    }

    if (this.timeLeft <= 0) {
      this.gameOverReason = 'timeout';
      this._gameOver('timeout');
    }
  }

  // ─── Difficulty ──────────────────────────────
  _increaseDifficulty() {
    if (this.isGameOver) return;
    this.difficulty++;

    this.spawnInterval = Math.max(
      MIN_SPAWN_INTERVAL,
      BASE_SPAWN_INTERVAL - this.difficulty * 80,
    );
    this.spawnTimer.delay = this.spawnInterval;

    const { width } = this.scale;
    const lvlText = this.add
      .text(width / 2, 130, 'Speed Up', {
        fontSize: '18px',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        color: '#FFD700',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({
      targets: lvlText,
      alpha: 1,
      y: 120,
      duration: 300,
      yoyo: true,
      hold: 800,
      onComplete: () => lvlText.destroy(),
    });
  }

  // ─── Game Over ───────────────────────────────
  _gameOver(reason = 'timeout', preDelay = 0) {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.gameOverReason = reason;
    this.sfx.gameOver();

    this.spawnTimer.remove();
    this.countdownTimer.remove();

    this.barrels.getChildren().forEach((b) => {
      if (b.active) {
        this.tweens.add({
          targets: b,
          alpha: 0,
          scale: 0,
          duration: 300,
          onComplete: () => b.destroy(),
        });
      }
    });

    const highScore = parseInt(
      localStorage.getItem('barrel_breaker_high') || '0',
    );
    const isNewHigh = this.score > highScore;
    if (isNewHigh) {
      localStorage.setItem('barrel_breaker_high', String(this.score));
    }

    this.time.delayedCall(800 + preDelay, () => {
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.time.delayedCall(400, () => {
        this.scene.start('GameOverScene', {
          score: this.score,
          barrelsSmashed: this.barrelsSmashed,
          maxCombo: this.maxCombo,
          isNewHigh,
          reason: this.gameOverReason,
        });
      });
    });
  }
}
