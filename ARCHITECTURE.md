# Echo Labs — Architecture Explained

This document walks through *why* the code is structured the way it is —
not just what each file does, but the reasoning behind each approach, so
you can modify it confidently or explain it to someone else.

---

## The big architectural decisions (made before any file existed)

Three decisions shaped everything else:

### 1. Plain `<script>` tags + a shared namespace, not ES modules

Modern JS usually splits code with `import`/`export` (ES modules). I
deliberately did **not** use that here, because `<script type="module">`
is blocked by browsers when a page is opened via `file://` (double-clicking
the HTML file) — it only works when served over `http://`. Since the whole
point of this project is "double-click `index.html`, no server, no build
step," ES modules would have silently broken the one thing you asked for.

Instead, every file does this:

```js
window.EL = window.EL || {};
EL.SomeModule = (function () { ... return { publicFn1, publicFn2 }; })();
```

Each file attaches one property to a single global object, `EL` (Echo
Labs). Because regular `<script>` tags all share one global scope, as long
as they load in dependency order (`utils.js` before `engine.js`, etc.),
each module can freely reference `EL.OtherModule.someFunction()`. The
IIFE (`(function(){...})()`) around each module's contents is what keeps
its *internal* variables (like `let echoes = []` inside `engine.js`) from
leaking into the global scope — only what's explicitly `return`ed becomes
accessible from outside.

This is essentially "the module pattern," a technique from before ES
modules existed. It's a deliberate trade-off: less elegant than `import`,
but zero build tooling and 100% `file://`-compatible.

### 2. A fixed timestep simulation, not "however fast the browser draws"

Naively, you could update physics once per animation frame:
`requestAnimationFrame` fires at whatever rate the monitor/browser
delivers (ideally 60fps, but it dips — background tabs, weaker hardware,
browser hiccups). If your gravity/speed math runs directly off however
much real time passed since the last frame, then:

- Physics becomes non-deterministic — the same inputs produce slightly
  different results depending on framerate.
- This game's **entire core mechanic is replaying recorded positions
  frame-by-frame**. If frame timing isn't consistent, an echo recorded at
  60fps would desync from a live run happening at 45fps — echoes would
  drift out of alignment with buttons/lasers/each other.

So `main.js` uses the "fixed timestep with accumulator" pattern: it tracks
real elapsed time, but only ever calls `EL.Engine.fixedUpdate()` in
constant-size chunks (`1000/60` ms each, i.e., a locked 60 simulation
steps per second), regardless of the actual monitor refresh rate:

```js
accumulator += delta;
while (accumulator >= FIXED_DT) {
  EL.Engine.fixedUpdate();
  accumulator -= FIXED_DT;
}
```

If the browser is slow and delivers a big `delta`, the `while` loop just
runs `fixedUpdate()` multiple times to "catch up" — the simulation always
advances in identical, predictable increments. This is *why* the recording
system can just be "an array of positions, one per step" and trust that
replaying it produces exactly the original motion.

Rendering (`EL.Render.drawScene()`) happens once per real animation frame,
outside that loop — drawing doesn't need to be deterministic, only the
simulation does.

### 3. An event bus in the engine, instead of the engine reaching into the DOM

`engine.js` never touches `document.getElementById(...)` anywhere. Instead
it does things like:

```js
emit('levelComplete', { timeSec, echoesUsed, stars });
```

and `ui.js` subscribes:

```js
E.on('levelComplete', ({ timeSec, echoesUsed, stars }) => { /* update DOM */ });
```

This is a one-way dependency: `ui.js` knows about `engine.js`, but
`engine.js` knows nothing about the DOM, HTML structure, or even that a
UI exists. Why this matters: it means the physics/puzzle logic is
testable and reusable independent of presentation — you could swap the
entire rendering/UI layer (e.g., render to a different canvas size, or
build a debug text-only view) without touching a single line of
simulation code. It also prevents a common bug pattern where UI code and
simulation code get tangled and start fighting over the same state.

---

## `index.html`

Structural role only — no logic. A few choices worth calling out:

- **Five `<section class="screen">` elements**, one per app "page" (menu,
  level select, settings, credits, game), all present in the DOM at once,
  toggled via a `hidden` CSS class rather than being created/destroyed
  dynamically. This is simpler than a router and totally sufficient for
  five static screens — `ui.js`'s `showScreen()` just hides all of them
  and un-hides one.
- **Overlays (`pause-overlay`, `level-complete-overlay`) live *inside*
  `#canvas-container`**, positioned `absolute` over the canvas, rather
  than being separate full-page modals. This keeps them visually scoped
  to the game viewport instead of covering the whole browser window.
- **The `<canvas>` itself has no logic in the markup** — it's just a
  drawing surface; `js/render.js` owns everything painted onto it.
- **Script load order matters and is intentional**: utilities and data
  first, systems that depend on them next, `engine.js` before `render.js`
  and `ui.js` (since both read engine state), `main.js` last (it's the
  only file that actively *starts* anything — every other file just
  defines functions/objects and waits to be called).

---

## `style.css`

A few deliberate choices beyond "make it look neon":

- **CSS custom properties (`--cyan`, `--purple`, etc.) defined once in
  `:root`.** Every glow/border color references these variables instead
  of repeating hex codes. Change the palette in one place, and every
  button, border, and text-shadow updates together.
- **Animations are CSS, not JavaScript, wherever the DOM already owns the
  element** — menu button hover/press, screen transitions, star pop-in,
  the hint banner sliding in. Browsers can run CSS animations off the
  main JS thread in many cases, and it means `ui.js` doesn't need to hand-
  animate DOM elements frame-by-frame; it just toggles a class and lets
  CSS handle the motion. JS-driven animation (`js/particles.js`,
  `js/camera.js`) is reserved for things that live *inside* the canvas,
  where CSS has no reach.
- **`cubic-bezier(0.34, 1.56, 0.64, 1)` on buttons** is an "overshoot"
  easing curve — it briefly scales past 1.0 before settling, giving a
  springy, game-like feel instead of the flatter, more "corporate web app"
  feel of a plain `ease` curve.
- **`#canvas-container::after` vignette** is a pure-CSS trick: an
  absolutely-positioned pseudo-element with an inset `box-shadow`
  darkening the canvas edges, without needing to draw it in JS every
  frame. Free atmosphere, zero runtime cost.

---

## `js/utils.js`

The smallest, most boring file on purpose. `rectsOverlap`, `clamp`,
`lerp`, `randRange` — generic helpers with no game-specific knowledge.
The reasoning for splitting this out at all: nearly every other module
needs rectangle-overlap testing (collision, button triggers, laser
hits), so it belongs in a shared, dependency-free file that everything
else can lean on without creating circular references between, say,
`engine.js` and `particles.js`.

## `js/ease.js`

A small library of named easing functions (`easeOutQuad`,
`easeInOutCubic`, `easeOutBack`, `easeOutElastic`, `easeOutBounce`). Why
bother with a library instead of just writing `Math.sin(...)` inline
wherever needed? Two reasons:

1. **Vocabulary.** `EL.Ease.easeOutBack(t)` documents *intent* ("this
   should overshoot and settle") right at the call site, versus an opaque
   polynomial expression.
2. **Reuse across very different systems** — the same `easeInOutCubic` is
   used for the room-transition wipe (`transitions.js`), the exit's
   breathing glow (`render.js`), and CSS-adjacent JS logic. One correct
   implementation, used everywhere, instead of five slightly-different
   copies.

Every easing function takes a single `t` from 0 to 1 (a normalized
"progress" value) and returns a new 0–1 value representing how far
through the *visual* motion you are — decoupling "how much real time has
passed" from "how far the animation has visually progressed" is the whole
point of easing.

## `js/input.js`

Wraps raw `keydown`/`keyup` browser events into a simple queryable API:
`EL.Input.left()`, `.jump()`, `.interact()`. Why not just check
`keys['KeyA']` directly in `engine.js`? Two reasons:

- **Key remapping in one place.** Both `A` and `ArrowLeft` count as
  "left" — that OR-logic lives in exactly one function
  (`left() { return keys['KeyA'] || keys['ArrowLeft']; }`), not scattered
  across every place movement is checked.
- **`preventDefault()` centralization.** Space and arrow keys normally
  scroll the page; that's suppressed here, once, for the specific key
  codes that need it — rather than every module that reads input having
  to remember to do it.

It also exposes a small pub/sub (`onKeyDown`) for *edge-triggered* input
(a key being pressed *this frame*, as opposed to *held down*), which
`main.js`/`ui.js` don't currently use but is there because the original
single-file version needed edge-detection for the interact key and it was
worth keeping the capability in the dedicated input module rather than
re-implementing it ad hoc later.

## `js/audio.js`

Every sound is wrapped in a `tryLoad` that attaches an `error` listener
setting that sound to `null` if the file 404s. This is why the entire
game runs *silently but without crashing* if you delete every file in
`assets/` — `EL.Audio.play('jump')` checks `if (!a) return;` before doing
anything. The reasoning: audio files are the one part of this project
that's genuinely optional/replaceable content (you might swap in your own
music), so the system is built to degrade gracefully rather than assume
the files will always exist.

`play()` clones the `Audio` node (`a.cloneNode()`) before playing it
rather than calling `.play()` on the original — this lets the *same*
sound effect overlap with itself (e.g., rapid jumping) instead of cutting
off the previous instance, which is what happens if you reuse one
`Audio` object for a sound that can trigger in quick succession.

## `js/save.js`

A thin wrapper around `localStorage`. The interesting part is the
defensive coding: `load()` is wrapped in `try/catch` and falls back to a
fresh save object if `localStorage` is unavailable (private browsing
modes, some locked-down environments) or if the stored JSON is corrupt.
Without this, a single malformed save could make the game refuse to
start at all — instead it just quietly resets progress. This module also
merges saved data with `fresh()`'s shape (`{...fresh(), ...parsed}`) so
that if you *add new fields* to the save format later, old save files
don't end up missing keys and crashing code that expects them.

## `js/levels.js`

Pure data, zero logic — deliberately. The reasoning: level design should
be something you can edit without understanding physics code, and
something the engine can validate/iterate over generically. Every level
is a plain object with the same shape (`spawn`, `exit`, `platforms`,
`movers`, `buttons`, `doors`, `lasers`, `boxes`, `hint`, `par`), so
`engine.js` never needs level-specific `if` statements — it just loops
over whatever arrays exist. Adding level 10 never requires touching
`engine.js`, `render.js`, or `ui.js` at all.

One specific design decision worth explaining: **movers derive their
position from time-within-the-current-cycle, not from absolute elapsed
time.** A mover's formula is a triangle wave over `t = cycleStep * dt`,
where `cycleStep` resets to 0 every time an echo is finalized. This is
required for echoes to work at all — if a platform moved according to
"real seconds since the page loaded," then every time you replay a cycle,
the platform would be somewhere different than it was when you originally
walked across it, and your recorded path would either whiff through empty
air or collide with something that wasn't there. Tying motion to
*cycle-relative* time guarantees the world looks identical at the same
point in every loop.

## `js/particles.js`

A pool-style system: one array (`list`) holding every active particle,
regardless of *kind*. Each particle has a `type` field (`'square'`,
`'ring'`, `'mote'`) that `draw()` switches on. The reasoning for one pool
instead of three separate systems (one for dust, one for rings, one for
ambient motes): they all need the same lifecycle management (age, life,
removal when expired), so sharing that logic in one `update()` avoids
duplicating the "increment age, splice out if expired" loop three times.

Particles are deliberately **dumb** — they don't know *why* they exist
(a jump, a death, a button press). `engine.js` decides *when* to call
`spawnBurst`/`spawnRing` and with *what* parameters (color, count, speed);
`particles.js` only knows how to animate whatever it's given. This keeps
"game logic" (when should sparks appear) separate from "particle physics"
(how do sparks move once they exist).

## `js/camera.js`

Uses a "trauma" model rather than directly setting a fixed shake
duration/magnitude. `shake(amount)` *adds* to a trauma value (capped at
1); trauma decays automatically every frame. The offset applied to the
canvas is `trauma²` scaled by a max pixel offset — squaring makes small
trauma barely noticeable but large trauma very punchy, which feels more
natural than a linear relationship. The practical benefit of trauma-based
shake over "play a shake animation for X ms": **multiple events stack
naturally.** If a laser kills you right as an echo is created, both
`shake()` calls just add trauma together and it decays as one smooth
motion, rather than needing to interrupt/queue/cancel competing shake
animations.

## `js/transitions.js`

A tiny two-phase state machine (`'out'` then `'in'`) driving a single
`t` value from 0 to 1 with `EL.Ease.easeInOutCubic` applied. The
`onMid` callback pattern — `play(() => { /* swap the level here */ })`
— exists so that the *actual* level-swap logic doesn't need to know
anything about fading; it just gets called at the exact moment the
screen is fully black, so the swap is invisible to the player. This
mirrors how real transitions work in bigger game engines: the transition
system owns *timing*, the caller owns *what happens at the midpoint*.

## `js/engine.js`

The largest and most important file — this is the only place simulation
*state* lives (`player`, `echoes`, `boxStates`, `doorOpen`, etc., are all
private `let` variables inside the IIFE, exposed only via getters). A few
specific design choices:

- **Echoes store an array of recorded frames, and playback clamps to the
  last frame if the cycle runs longer than the recording:**
  `frames[Math.min(cycleStep, frames.length - 1)]`. This single line is
  *why* the manual "Create Echo Now" feature (added later) works for
  free — a shorter recording just means the echo freezes at wherever it
  was cut off, which is exactly the desired "hold this position forever"
  behavior, with zero additional code.
- **Box-pushing must run *before* the general collision resolver, not
  after.** This was an actual bug found during development: the collision
  resolver treats boxes as solid and stops the player exactly at a box's
  edge, so a *later* check for "has the player overlapped into the box"
  could never fire — the general collision already prevented that
  overlap from ever existing. Moving the push-check earlier, so it runs
  against the *tentative* (pre-collision-correction) position, is what
  makes pushing possible at all.
- **Death only clears the current, in-progress recording — not the whole
  echo list.** `softResetRun()` resets `player`/`cycleStep`/
  `currentRecording`, but never touches the `echoes` array. This was a
  deliberate design choice (matching the classic puzzle-platformer
  "Company of Myself"): losing your current attempt shouldn't force you
  to redo every previous successful echo, only the run you were actively
  on.
- **Buttons/doors/lasers are recomputed from scratch every single frame**
  (`buttonActive[btn.id] = actors.some(...)`), rather than using
  persistent "is it currently on" flags that get toggled. This makes the
  logic trivially correct — a button is active if and only if something
  is standing on it *right now* — at the cost of being slightly more
  computation than strictly necessary. For a puzzle game with a handful
  of buttons and a handful of actors, that cost is irrelevant, and
  "recompute from truth every frame" avoids an entire category of stale-
  state bugs that toggle-based logic is prone to.

## `js/render.js`

Draws the world **inside a `ctx.save()`/`ctx.translate(shake.dx,
shake.dy)`/`ctx.restore()` block**, but the transition-wipe overlay is
drawn *after* `ctx.restore()`. This ordering is deliberate: camera shake
should visibly rattle the game world, but the fade-to-black wipe between
rooms should stay perfectly still on screen — nothing would look more
wrong than a black transition overlay itself jittering from screen shake.

Glow effects (`ctx.shadowColor`/`ctx.shadowBlur`) are wrapped in small
`glow()`/`noGlow()` helper calls immediately before/after each shape, so
shadow settings never "leak" onto a shape that wasn't meant to glow — a
common Canvas 2D bug is forgetting to reset `shadowBlur` and having every
subsequent draw call unintentionally blurred.

Render never *mutates* simulation state — it only reads `EL.Engine`'s
getters. This one-directional flow (`engine` produces truth → `render`
visualizes truth) is what makes it possible to reason about a rendering
bug without worrying it might also be a physics bug, and vice versa.

## `js/ui.js`

The DOM-facing counterpart to `engine.js`. Its central technique is
`E.on('eventName', callback)` — it never polls "is the level complete
yet?" every frame; instead it registers a callback once, and the engine
calls it exactly when the event happens. This avoids duplicate-firing
bugs (a naive `if (E.levelComplete) showOverlay()` checked every frame
would try to show the overlay repeatedly for as long as the condition
stays true, unless you add extra bookkeeping to suppress the repeats —
the event pattern sidesteps that entirely).

`showScreen()` force-retriggers the CSS entrance animation with a
`void el.offsetWidth;` line before re-adding the animation class. This is
a real browser quirk: if you remove and immediately re-add the same CSS
class, the browser may not restart the animation because nothing "forced
it to notice" the class was gone even briefly. Reading `offsetWidth`
forces a layout recalculation between the remove and the re-add, which
reliably restarts the animation every time.

## `js/main.js`

Deliberately tiny — its only job is running the fixed-timestep loop and
calling into the other systems in the right order each frame:
`Engine.fixedUpdate()` (simulation, only while running) → `Camera.update`
/`Particles.update`/`Transitions.update` (visual systems, *always*, even
while paused, so effects finish smoothly instead of freezing mid-motion)
→ `Render.drawScene()` → `UI.updateHud()`. Keeping this file free of any
actual game logic means the "entry point" of the whole program reads
almost like a table of contents for the architecture — useful both for
you and for anyone else opening this codebase cold.
