# Echo Labs

A puzzle-platformer about escaping your own past. Every 10 seconds your
actions are recorded — when the timer runs out, a translucent ghost clone
starts repeating exactly what you just did, forever, while you take control
of your real body again. Use up to 5 echoes at once to hold plates, block
lasers, and open doors for your current self.

🎮 **[Play Live Demo Here](https://ayesha-at.github.io/Echo-labs/)**

Built entirely from scratch: no engine, no frameworks, no build step — just
`index.html` + `style.css` + `game.js` and the Canvas 2D API.

## How to run

Fully **extract** this folder from any zip first (don't open `index.html`
from inside a zip — the browser can't load `style.css`/`game.js`/`assets/`
that way). Then just double-click `index.html`, or serve it locally:

```
python3 -m http.server 8000
```
and visit `http://localhost:8000`.

## Controls

- **A / D** — move
- **Space** (or W / Up) — jump
- **E** — interact (visually highlights your character; wire up to specific
  puzzle objects as you add them — see "Extending" below)
- **R** — restart the current room instantly
- **Esc** — pause

## The core mechanic, precisely

- Each level has a **10-second cycle** (configurable per level).
- While the cycle runs, your live position is recorded every physics step.
- When the cycle ends: that recording becomes a permanent **echo** that
  loops forever, replaying the exact same movement every cycle from then on.
  You respawn at the start and begin a fresh recording.
- Up to **5 echoes** can exist at once; a 6th bumps the oldest one out.
- Touching a laser only resets your **current, in-progress run** — any
  echoes you've already banked stay put. (Full room reset is `R`.)
- Moving platforms/elevators are driven by time-within-the-current-cycle,
  not real elapsed time — so they line up identically every loop and your
  echoes stay in sync with them.

## What's included

- Full main menu → level select → settings → credits → gameplay flow, with
  animated screen transitions (fade + slide, spring easing)
- 9 handcrafted levels covering the whole progression you described:
  tutorial → moving platforms → lasers → 2 echoes required → 3 echoes →
  final level using all 5
- Pressure plates, locked doors (AND logic across multiple plates), lasers
  gated by plates, pushable boxes, moving platforms, and a vertical elevator
- Neon cyan/purple canvas rendering (no image assets — everything is drawn
  procedurally with glow effects) with:
  - **Particles** — jump/landing dust, laser-death sparks, echo-creation
    bursts, box-push dust, exit-clear confetti, and drifting ambient dust
    motes in the background
  - **Screen shake** — trauma-based camera shake on death, echo creation,
    door unlocks, and level completion
  - **Easing curves** (`js/ease.js`) — quad/cubic/back/elastic/bounce —
    driving the room-transition wipe, the "NEW ECHO CREATED" pop-in, the
    breathing exit-door bloom, and CSS button/screen animations
  - **Bloom pulses** — expanding glow rings on button activation, door
    unlocks, and echo spawns; pulsing glow on held plates and the exit
  - **Transition animations** — a glitchy canvas wipe between rooms
    (`js/transitions.js`), plus CSS fade/slide entrances for every menu
    screen and a staggered star pop-in on the level-complete screen
- Synthesized sound effects (`jump.wav`, `interact.wav`, `echo.wav` — plays
  when a new echo is created, `success.wav`, `death.wav`) and a looping
  ambient lab drone (`ambient.mp3`)
- Star rating (1–3) per level based on time and echo count vs. par
- **Autosave** via `localStorage` — unlocked levels and best stars/times
  persist between sessions on the same browser/machine
- Pause menu, restart-room, level-complete screen with time/echoes/stars

## Code organization

The engine is split into focused modules under `js/`, loaded as plain
`<script>` tags (no bundler, no build step — still just double-click
`index.html`). Each file attaches to a shared `window.EL` namespace so they
can reference each other without any module system:

```
js/
├── utils.js        # rect overlap, clamp, lerp, small math helpers
├── ease.js          # easing curve library (quad/cubic/back/elastic/bounce)
├── input.js         # keyboard state tracking
├── audio.js         # sfx/music loading with graceful fallback + volume
├── save.js          # localStorage autosave
├── levels.js         # the LEVELS data array — edit this to add levels
├── particles.js      # particle pool: dust/sparks/confetti + bloom rings
├── camera.js         # trauma-based screen shake
├── transitions.js    # canvas wipe transition between rooms
├── engine.js          # physics, echo recording/playback, puzzle logic
├── render.js         # all canvas drawing (glow, particles, shake, wipe)
├── ui.js             # DOM screens, HUD, menus, level-complete stars
└── main.js           # bootstraps canvas + runs the fixed-timestep loop
```

`engine.js` is the only file that touches simulation state; it fires events
(`levelComplete`, `echoCreated`, `pauseChanged`, `levelReset`) that
`ui.js` and the juice systems listen to, rather than reaching into each
other directly — so you can swap out rendering or add new effects without
touching the physics/puzzle logic.

## A note on scope

You described 20–30 handcrafted levels — I built the full engine plus 9
levels that walk through every mechanic and difficulty beat you listed
(tutorial → moving platforms → lasers → 2 echoes → 3 echoes → 5-echo
finale). Getting to your full 20–30 is now just a matter of adding more
entries to the `LEVELS` array in `game.js` — no engine changes needed. See
below for the format.

I also haven't been able to hands-on playtest exact jump distances/timing
in a real browser, so a couple of the trickier levels (7 and 9, which
involve timed jumps onto moving elevators) may need small tuning — nudge
`distance`/`period` on the mover, or move a platform a few pixels, if a jump
feels a hair too tight or too loose.

## Level format (for adding more levels)

Each entry in the `EL.Levels` array in `js/levels.js` looks like this:

```js
{
  name: '10 · Your Level Name',
  cycleSeconds: 10,                                  // echo loop length
  spawn: { x: 40, y: 350 },
  exit: { x: 742, y: 352, w: 40, h: 48 },
  platforms: [ { x, y, w, h }, ... ],                 // static solid ground
  movers: [ { id, x, y, w, h, axis: 'x'|'y', distance, period } ],
  buttons: [ { id, x, y, w, h } ],                    // pressure plates
  doors: [ { id, x, y, w, h, requires: ['p1', 'p2'] } ], // ALL must be active
  lasers: [ { id, x1, y1, x2, y2, requires: 'p1' } ],  // omit `requires` = always on
  boxes: [ { id, x, y, w, h } ],                      // pushable by the live player
  hint: 'Shown briefly when the level starts.',
  par: { time: 20, echoes: 2 },                       // for star rating
}
```

Just append a new object and it appears in Level Select automatically once
unlocked.

## Project structure

```
echo-labs/
├── index.html      # menus, HUD, overlays
├── style.css       # neon dark-lab visual theme + all CSS animations
├── js/             # engine modules — see "Code organization" above
│   ├── utils.js
│   ├── ease.js
│   ├── input.js
│   ├── audio.js
│   ├── save.js
│   ├── levels.js
│   ├── particles.js
│   ├── camera.js
│   ├── transitions.js
│   ├── engine.js
│   ├── render.js
│   ├── ui.js
│   └── main.js
├── assets/         # generated SFX + ambient music (optional — game runs
│                   # silently if any file is missing)
│   ├── jump.wav
│   ├── interact.wav
│   ├── echo.wav
│   ├── success.wav
│   ├── death.wav
│   └── ambient.mp3
└── README.md
```
