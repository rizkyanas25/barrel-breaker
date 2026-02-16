# Barrel Breaker - Flow & Function Guide

Dokumen ini buat ngebantu lo ngejelasin arsitektur app saat interview: flow scene, fungsi penting, dan kenapa desainnya dibuat begitu.

## 1) Gambaran Arsitektur

- Engine: Phaser 3
- Entry point: `src/main.js`
- Pattern utama: scene-based game loop
- Urutan scene aktif:
  1. `MenuScene`
  2. `GameScene`
  3. `GameOverScene`

`main.js` cuma setup config Phaser (ukuran 480x854, scale fit-center) dan daftar scene.

## 2) High-Level Runtime Flow

1. App start ke `MenuScene`.
2. `MenuScene.preload()` load asset sprite/audio + generate texture procedural.
3. User klik `START GAME`.
4. Transition ke `GameScene`.
5. `GameScene` spawn barrel loop + timer loop + difficulty escalation loop.
6. Game selesai kalau:
   - `timeLeft <= 0` (reason: `timeout`)
   - `lives <= 0` (reason: `health`)
7. Pindah ke `GameOverScene` sambil bawa summary hasil (`score`, `barrelsSmashed`, `maxCombo`, `isNewHigh`, `reason`).
8. Dari `GameOverScene`, user bisa retry (balik `GameScene`) atau menu (`MenuScene`).

## 3) Scene-by-Scene Detail

## 3.1 `MenuScene`

File: `src/scenes/MenuScene.js`

Tanggung jawab:
- Preload semua asset inti (sprite Luffy, BGM, dsb).
- Generate texture procedural (barrel, button, heart, background).
- Register animasi global:
  - `luffy_walk`
  - `luffy_menu_idle`
  - `luffy_attack_jump`
  - `luffy_win_celebrate`
  - `luffy_lose_loop`
  - `luffy_death_fall`
- Render UI menu (title, best score, preview rules, CTA start).
- Mainkan menu BGM (`menu_bgm`).
- Sediakan tombol `SOUND ON/OFF`.

Fungsi penting:
- `_queueCoreAssets()`:
  load sprite sheet dan audio statis yang dipakai scene lain.
- `_ensureAnimations()`:
  bikin anim sekali aja (`if !exists`) supaya reusable antar scene.
- `_generateTextures()`:
  bikin asset visual procedural via Graphics API.
- `startGame()` (callback tombol start):
  fade out lalu `scene.start('GameScene')`.

## 3.2 `GameScene`

File: `src/scenes/GameScene.js`

Tanggung jawab:
- Core gameplay loop.
- Spawn & interaction barrel.
- Scoring, combo, life, timer, difficulty.
- Trigger SFX dan feedback visual.
- Tentuin reason game over.

State penting di `init()`:
- `score`, `lives`, `timeLeft`
- `combo`, `maxCombo`, `barrelsSmashed`
- `spawnInterval`, `difficulty`
- `lastClickX` (tracking posisi target Luffy)
- `gameOverReason` (`timeout` / `health`)
- `isDeathSequencePlaying`

Loop utama:
- Spawn barrel timer (`_spawnBarrel`) dengan interval dinamis.
- Countdown timer (`_tick`) tiap 1 detik.
- Difficulty naik tiap 10 detik (`_increaseDifficulty`).

Interaction barrel:
- `_onBarrelTapped()`:
  route ke handler sesuai tipe (`normal/gold/time/bomb`).
- `stack priority logic`:
  kalau x hampir sejajar, barrel bawah diprioritaskan dulu (`_getLowerPriorityBarrel`).

Hit handlers:
- `_onNormalHit()`:
  hit sukses, combo naik, points + multiplier, popup + particles.
- `_onTimeHit()`:
  tambah `+5s`, update HUD timer.
- `_onBombHit()`:
  life berkurang, feedback damage.
  kalau life jadi 0:
  - jalankan `_playLuffyDeath()`
  - set reason `health`
  - trigger `_gameOver('health', preDelay)`

Game over:
- `_gameOver(reason, preDelay)`:
  stop timer/spawn, simpan high score, transition ke `GameOverScene` dengan payload.

## 3.3 `GameOverScene`

File: `src/scenes/GameOverScene.js`

Tanggung jawab:
- Tampilkan hasil akhir.
- Render karakter result berdasarkan reason:
  - `timeout` -> `luffy_win`
  - `health` -> `luffy_lose`
- Tetap lanjutkan `game_bgm` (tidak restart track kalau sama).
- Aksi tombol retry/menu.

Data input via `init(data)`:
- `score`, `barrelsSmashed`, `maxCombo`, `isNewHigh`, `reason`

## 4) Audio System

Folder: `src/audio/`

- `bgm.js`:
  manager BGM global lintas scene.
  menjaga track tetap lanjut kalau scene pindah tapi key BGM sama.
- `sfx.js`:
  procedural SFX berbasis WebAudio oscillator (tanpa file SFX eksternal).
- `settings.js`:
  mute state global + persistence ke `localStorage`.
- `toggle.js`:
  helper UI tombol `SOUND ON/OFF` per scene.

Rule audio saat ini:
- Menu: `menu_bgm`
- Game: switch ke `game_bgm`
- GameOver: tetap `game_bgm`

## 5) Data Persistence

Pakai `localStorage` untuk:
- `barrel_breaker_high` (best score)
- `barrel_breaker_audio_muted` (status mute)

## 6) Konsep Desain yang Bisa Dijelasin Saat Interview

- Scene separation:
  tiap scene punya single responsibility (menu/game/result).
- Deterministic game state:
  state inti di `init()` dan transisi antar state lewat method jelas.
- UX feedback layering:
  visual (particles/tween), audio (BGM+SFX), dan text popup berjalan bareng.
- Cross-scene shared services:
  audio manager dibuat global supaya behavior konsisten dan transisi mulus.
- Asset strategy hybrid:
  gabungan asset statis (sprite/audio) + procedural textures untuk elemen UI/game object sederhana.

## 7) Quick Q&A Prep

Q: Kenapa scene dipisah tiga?
A: Biar flow lifecycle jelas, modular, dan gampang scale tanpa campur logic menu-game-result.

Q: Kenapa BGM pakai manager global?
A: Supaya track bisa lanjut lintas scene, gak restart tiap ganti scene, dan kontrol volume/mute konsisten.

Q: Kenapa ada procedural texture?
A: Mengurangi ketergantungan asset tambahan untuk elemen generik (barrel/btn/particle), bikin iterasi visual cepat.

Q: Handle edge case barrel ketumpuk gimana?
A: Ada prioritas hit untuk barrel paling bawah pada lane x yang hampir sama, sesuai logika pukulan dari bawah.
