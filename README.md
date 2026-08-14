# Echo Labs

> **A puzzle-platformer about escaping your own past.**

Every **10 seconds**, your actions are recorded. When time runs out, a translucent ghost clone replays your exact actions forever while you regain control of your body. Coordinate with up to **5 echoes** simultaneously to press plates, block deadly lasers, and navigate past security doors.

---

## 🎮 Quick Links

* 🕹️ **[Play the Live Demo](https://ayesha-at.github.io/Echo-labs/)**
* 🛠️ **Tech Stack:** `HTML5` • `CSS3` • `JavaScript (ES6)` • `Canvas 2D API`
* ⚡ **Dependencies:** None! No engines, no frameworks, no build step.

---

## 🚀 Getting Started

> **Important:** Fully **extract** the repository before running. Opening `index.html` directly from a `.zip` archive will cause path resolution errors for CSS, JS, and asset files.

### 1️⃣ Option A: Direct Launch
Double-click `index.html` in your browser.

### 2️⃣ Option B: Local Development Server
For optimal audio and module performance, serve locally via Python:

```bash
# Run a local HTTP server
python3 -m http.server 8000
```
Then navigate to **`http://localhost:8000`** in your browser.

---

## 🕹️ Controls & Inputs

| Action | Desktop Key | Mobile / Touch |
| :--- | :--- | :--- |
| **Move Left / Right** | <kbd>A</kbd> / <kbd>D</kbd> | On-Screen Left/Right Arrows |
| **Jump** | <kbd>Space</kbd> / <kbd>W</kbd> / <kbd>▲</kbd> | On-Screen Jump Button |
| **Interact** | <kbd>E</kbd> | On-Screen Action Button |
| **Restart Room** | <kbd>R</kbd> | Top-Right Quick Reset |
| **Pause** | <kbd>Esc</kbd> | Top-Right Pause Button |

> 📱 **Mobile Support:** On-screen controls automatically render via feature detection (`js/touch-controls.js`). Touch interactions emit synthetic keyboard events—zero code changes required!

---

## ⏱️ Core Mechanics

```
 [ LIVE PLAYER ] ──( 10 Seconds Pass )──> [ RECORDING COMPLETE ]
        │                                          │
        ▼                                          ▼
 [ RESPAWN AT START ] <──( Loop Forever )── [ BANK ECHO #1 ]
```

* **10-Second Cycles:** Every level runs on a configurable time loop.
* **Echo Loops:** When the cycle resets, your movement history becomes a permanent **echo** running in parallel.
* **Echo Limit:** You can maintain up to **5 active echoes**. Spawning a 6th automatically overwrites the oldest echo.
* **Laser Hazards:** Touching a laser resets only your *current live run*—your banked echoes remain intact!
* **Deterministic Timing:** Platform and elevator positions align strictly with cycle time, ensuring zero desync with your echoes.

---

## ⚡ Game Features & Polish

<details>
<summary><b>✨ Juice & Visual Effects (Click to Expand)</b></summary>

* **Procedural Canvas Graphics:** Glowing neon cyan/purple aesthetic with zero external sprite dependencies.
* **Particle Systems:** Contextual dust on jumps/landings, laser-death sparks, echo creation bursts, and ambient drifting dust motes.
* **Trauma-Based Screen Shake:** Dynamic camera impact on deaths, echo spawns, door triggers, and level clears.
* **Custom Easing Library:** Dynamic Quad, Cubic, Back, Elastic, and Bounce curves driving UI transitions and in-game mechanics.
* **Screen Transitions:** Glitchy canvas wipe sequences paired with spring-eased CSS menu animations.
</details>

<details>
<summary><b>🎵 Audio & Progression Systems (Click to Expand)</b></summary>

* **Synthesized Audio:** Custom sound effects (`jump`, `interact`, `echo`, `success`, `death`) and ambient lab drones with dynamic fallback.
* **Level Progression:** 9 handcrafted levels spanning basic tutorials to complex 5-echo puzzle chains.
* **Persistence:** Automatic saving via `localStorage` tracking best clearance times, star ratings (1–3), and unlocked levels.
</details>

---

## 🛠️ Code Architecture

The engine is modularized into lightweight, standalone scripts under `js/`. Modules register under a unified `window.EL` global context to avoid bundle overhead.

```
echo-labs/
├── 📄 index.html        # DOM layout, UI overlays, HUD
├── 🎨 style.css         # Neon lab theme & CSS keyframe animations
├── 📁 js/
│   ├── 🛠️ utils.js       # Math helpers, collision bounds, clamps
│   ├── 📈 ease.js        # Easing curve engine
│   ├── ⌨️ input.js       # Keyboard event listener state
│   ├── 🔊 audio.js       # WebAudio API controller & fallback
│   ├── 💾 save.js        # LocalStorage persistence manager
│   ├── 🗺️ levels.js       # Level configuration data array
│   ├── 💥 particles.js   # Particle pool, bloom rings, and effects
│   ├── 🎥 camera.js      # Trauma-based camera shake engine
│   ├── 🎬 transitions.js # Canvas glitch room wipes
│   ├── ⚙️ engine.js     # Physics, cycle ticks, echo recording/playback
│   ├── 🎨 render.js     # Procedural drawing, glow layers, canvas pipeline
│   ├── 🖥️ ui.js         # HUD updates, menu navigation, dynamic stars
│   ├── 📱 touch-controls.js # On-screen mobile input overlays
│   └── 🚀 main.js       # Canvas bootstrap & fixed-timestep loop
└── 📁 assets/           # SFX and background audio
```

> 💡 **Decoupled Event System:** `engine.js` manages state and dispatches events (`levelComplete`, `echoCreated`, `pauseChanged`) listened to by `ui.js` and visual sub-systems. Physics logic can be altered without breaking renderers or UI.

---

## 📐 Level Creation Guide

Adding new levels is as simple as appending a JSON definition to the `EL.Levels` array in `js/levels.js`:

```javascript
{
  name: '10 · Echo Chamber',
  cycleSeconds: 10,
  spawn: { x: 40, y: 350 },
  exit: { x: 742, y: 352, w: 40, h: 48 },
  platforms: [ { x: 0, y: 400, w: 800, h: 20 } ],
  movers: [ { id: 'm1', x: 200, y: 300, w: 80, h: 16, axis: 'x', distance: 100, period: 4 } ],
  buttons: [ { id: 'p1', x: 150, y: 390, w: 32, h: 10 } ],
  doors: [ { id: 'd1', x: 600, y: 300, w: 20, h: 100, requires: ['p1'] } ],
  lasers: [ { id: 'l1', x1: 400, y1: 0, x2: 400, y2: 400, requires: 'p1' } ], // Off when p1 pressed
  boxes: [ { id: 'b1', x: 100, y: 360, w: 30, h: 30 } ],
  hint: 'Use an echo to keep the pressure plate held!',
  par: { time: 20, echoes: 2 }
}
```
