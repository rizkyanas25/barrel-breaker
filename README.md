# Barrel Breaker! 🏴‍☠️

Fast-paced One Piece-themed tap arcade game. Smash barrels, dodge bombs, chase combos, and survive the 60-second deck challenge.

![Phaser](https://img.shields.io/badge/Phaser-3.90-0D1137?logo=phaser)
![Vite](https://img.shields.io/badge/Vite-7.3-646CFF?logo=vite)
![JavaScript](https://img.shields.io/badge/JavaScript-ESM-F7DF1E?logo=javascript&logoColor=000)
![License](https://img.shields.io/badge/License-MIT-22c55e)

## ✨ Features

- 🎯 **Tap Arcade Gameplay** - Quick sessions with score, timer, lives, and combo tracking
- 🛢️ **Multiple Barrel Types** - Normal (+10), Gold (+50), Time (+5s), and Bomb (-1 life)
- 🥊 **Directional Hit Logic** - If barrels stack in the same lane, lower barrel is prioritized first
- 🏃 **Luffy Movement Feedback** - Character tracks tap position and reacts on hit, combo, damage, and defeat
- 🎵 **Audio System** - Scene-based BGM (`menu_bgm`/`game_bgm`), procedural SFX, and global mute toggle
- 🏆 **Persistent Progress** - High score and audio mute preference saved via localStorage
- 📱 **Mobile Portrait Ready** - Tuned for 480x854 gameplay with responsive fit scaling

## 🛠️ Tech Stack

| Category | Technology |
| -------- | ---------- |
| Engine | Phaser 3 |
| Bundler | Vite |
| Language | JavaScript (ES Modules) |
| Audio | Phaser Sound + WebAudio (procedural SFX) |
| Storage | localStorage |

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🎮 Game Rules

- Tap/click barrels before they disappear
- `Normal barrel` gives `+10` points
- `Gold barrel` gives `+50` points
- `Time barrel` gives `+5` seconds
- `Bomb barrel` removes `1` life
- Run ends when timer hits `0` or lives reach `0`

## 📁 Project Structure

```
src/
├── audio/          # BGM manager, SFX generator, mute settings/toggle
├── scenes/         # MenuScene, GameScene, GameOverScene
└── main.js         # Phaser config and scene bootstrapping

public/
└── assets/         # Luffy sprites and other static game assets
```

## 📄 License

MIT

---

_Built with Phaser 3 for quick arcade runs._
