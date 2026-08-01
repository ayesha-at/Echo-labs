// ============================================================
// ENGINE — fixed-timestep simulation: player physics, echo
// recording/playback, buttons/doors/lasers/boxes, and all the
// juicy event hooks (particles, screen shake, sfx) tied to
// state changes.
// ============================================================
window.EL = window.EL || {};

EL.Engine = (function () {
  const U = EL.Utils;

  const FIXED_DT = 1000 / 60;
  const GRAVITY = 0.6;
  const MOVE_SPEED = 3.6;
  const JUMP_POWER = -12.2;
  const MAX_FALL = 14;
  const MAX_ECHOES = 5;
  const PLAYER_W = 26, PLAYER_H = 36;
  const WORLD_W = 800, WORLD_H = 450;

  let level = null;
  let levelIndex = 0;
  let STEPS_PER_CYCLE = 600;
  let cycleStep = 0;
  let player = null;
  let currentRecording = [];
  let echoes = [];
  let boxStates = [];
  let doorOpen = {};
  let prevDoorOpen = {};
  let laserOn = {};
  let buttonActive = {};
  let prevButtonActive = {};
  let running = false;
  let paused = false;
  let levelComplete = false;
  let levelStartRealTime = 0;
  let elapsedLevelMs = 0;
  let deathFlashTimer = 0;
  let hintTimer = 0;
  let echoFlashTimer = 0;
  let wasOnGround = false;
  let manualEchoRequested = false;

  const listeners = {}; // simple event bus: 'levelComplete', 'echoCreated', etc.
  function on(evt, fn) { (listeners[evt] = listeners[evt] || []).push(fn); }
  function emit(evt, payload) { (listeners[evt] || []).forEach((fn) => fn(payload)); }

  function resetLevelState(idx) {
    if (idx !== undefined) levelIndex = idx;
    level = EL.Levels[levelIndex];
    STEPS_PER_CYCLE = Math.round((level.cycleSeconds * 1000) / FIXED_DT);
    cycleStep = 0;
    player = { x: level.spawn.x, y: level.spawn.y, vx: 0, vy: 0, onGround: false, facing: 1, w: PLAYER_W, h: PLAYER_H };
    currentRecording = [];
    echoes = [];
    boxStates = level.boxes.map((b) => ({ id: b.id, x: b.x, y: b.y, w: b.w, h: b.h }));
    doorOpen = {}; prevDoorOpen = {}; laserOn = {}; buttonActive = {}; prevButtonActive = {};
    level.doors.forEach((d) => { doorOpen[d.id] = false; prevDoorOpen[d.id] = false; });
    level.lasers.forEach((l) => (laserOn[l.id] = true));
    level.buttons.forEach((b) => { buttonActive[b.id] = false; prevButtonActive[b.id] = false; });
    levelComplete = false;
    paused = false;
    levelStartRealTime = performance.now();
    elapsedLevelMs = 0;
    deathFlashTimer = 0;
    hintTimer = 240;
    echoFlashTimer = 0;
    wasOnGround = false;
    manualEchoRequested = false;
    EL.Particles.clear();
    emit('levelReset', level);
  }

  function rectsOverlap(a, b) { return U.rectsOverlap(a, b); }

  function moverRect(m, t) {
    const phase = (t % m.period) / m.period;
    const tri = phase < 0.5 ? phase * 2 : 2 - phase * 2;
    const offset = tri * m.distance;
    if (m.axis === 'x') return { x: m.x + offset, y: m.y, w: m.w, h: m.h };
    return { x: m.x, y: m.y - offset, w: m.w, h: m.h };
  }

  function getSolids(t) {
    const solids = level.platforms.slice();
    level.movers.forEach((m) => solids.push(moverRect(m, t)));
    boxStates.forEach((b) => solids.push(b));
    level.doors.forEach((d) => { if (!doorOpen[d.id]) solids.push(d); });
    return solids;
  }

  function resolveAxisCollision(axis) {
    const t = (cycleStep * FIXED_DT) / 1000;
    const solids = getSolids(t);
    for (const s of solids) {
      if (!rectsOverlap(player, s)) continue;
      if (axis === 'y') {
        if (player.vy > 0) { player.y = s.y - player.h; player.vy = 0; player.onGround = true; }
        else if (player.vy < 0) { player.y = s.y + s.h; player.vy = 0; }
      } else {
        if (player.vx > 0) player.x = s.x - player.w;
        else if (player.vx < 0) player.x = s.x + s.w;
      }
    }
  }

  function fixedUpdate() {
    if (paused || levelComplete) return;
    const t = (cycleStep * FIXED_DT) / 1000;

    if (EL.Input.left()) { player.vx = -MOVE_SPEED; player.facing = -1; }
    else if (EL.Input.right()) { player.vx = MOVE_SPEED; player.facing = 1; }
    else { player.vx = 0; }

    if (EL.Input.jump() && player.onGround) {
      player.vy = JUMP_POWER;
      player.onGround = false;
      EL.Audio.play('jump');
      EL.Particles.spawnBurst(player.x + player.w / 2, player.y + player.h, {
        color: '#2ee6d6', count: 6, speed: 1.6, life: 0.3, size: 3, angle: Math.PI / 2, spread: 1.4, gravity: 0.15,
      });
    }

    player.vy += GRAVITY;
    if (player.vy > MAX_FALL) player.vy = MAX_FALL;

    player.x += player.vx;

    // box pushing (live player only) — must run BEFORE resolveAxisCollision,
    // since that resolver would otherwise stop the player exactly at the
    // box's edge and the overlap this logic looks for would never happen
    if (player.vx !== 0) {
      const dir = player.vx > 0 ? 1 : -1;
      for (const b of boxStates) {
        if (!rectsOverlap(player, b)) continue;
        const newX = b.x + dir * MOVE_SPEED;
        const testBox = { ...b, x: newX };
        const blocked = [...level.platforms, ...boxStates.filter((o) => o !== b)]
          .some((s) => rectsOverlap(testBox, s));
        const outOfBounds = newX < 0 || newX + b.w > WORLD_W;
        if (!blocked && !outOfBounds) {
          b.x = newX;
          if (cycleStep % 6 === 0) {
            EL.Particles.spawnBurst(b.x + (dir > 0 ? 0 : b.w), b.y + b.h, {
              color: '#5a5f8a', count: 2, speed: 0.6, life: 0.2, size: 2, gravity: 0.1,
            });
          }
        }
      }
    }

    resolveAxisCollision('x');

    player.y += player.vy;
    player.onGround = false;
    resolveAxisCollision('y');

    if (player.x < 0) player.x = 0;
    if (player.x + player.w > WORLD_W) player.x = WORLD_W - player.w;

    // landing dust
    if (player.onGround && !wasOnGround) {
      EL.Particles.spawnBurst(player.x + player.w / 2, player.y + player.h, {
        color: '#8b90c9', count: 5, speed: 1.2, life: 0.25, size: 2.5, angle: -Math.PI / 2, spread: 2.6, gravity: 0.1,
      });
    }
    wasOnGround = player.onGround;

    if (player.y > WORLD_H + 60) { softResetRun(false); return; }

    // buttons
    const echoActorsNow = echoes.map((e) => e.frames[Math.min(cycleStep, e.frames.length - 1)]);
    const actors = [player, ...echoActorsNow];
    level.buttons.forEach((btn) => {
      const active = actors.some((a) => a && rectsOverlap({ x: a.x, y: a.y, w: a.w || PLAYER_W, h: a.h || PLAYER_H }, btn))
        || boxStates.some((b) => rectsOverlap(b, btn));
      buttonActive[btn.id] = active;
      if (active && !prevButtonActive[btn.id]) {
        EL.Particles.spawnRing(btn.x + btn.w / 2, btn.y + btn.h / 2, { color: '#57ff9c', maxRadius: 46, life: 0.45 });
      }
      prevButtonActive[btn.id] = active;
    });

    // doors
    level.doors.forEach((d) => {
      doorOpen[d.id] = d.requires.every((id) => buttonActive[id]);
      if (doorOpen[d.id] && !prevDoorOpen[d.id]) {
        EL.Particles.spawnRing(d.x + d.w / 2, d.y + d.h / 2, { color: '#57ff9c', maxRadius: 50, life: 0.5, lineWidth: 4 });
        EL.Camera.shake(0.08);
      }
      prevDoorOpen[d.id] = doorOpen[d.id];
    });

    // lasers
    level.lasers.forEach((l) => { laserOn[l.id] = l.requires ? !buttonActive[l.requires] : true; });

    for (const l of level.lasers) {
      if (!laserOn[l.id]) continue;
      const lx = Math.min(l.x1, l.x2) - 3, ly = Math.min(l.y1, l.y2) - 3;
      const lw = Math.abs(l.x2 - l.x1) + 6, lh = Math.abs(l.y2 - l.y1) + 6;
      if (rectsOverlap(player, { x: lx, y: ly, w: lw, h: lh })) { softResetRun(true); return; }
    }

    currentRecording.push({
      x: player.x, y: player.y, facing: player.facing,
      interacting: EL.Input.interact(), w: player.w, h: player.h,
    });

    if (rectsOverlap(player, level.exit)) { completeLevel(); return; }

    cycleStep++;
    if (cycleStep >= STEPS_PER_CYCLE || manualEchoRequested) {
      manualEchoRequested = false;
      finalizeEcho();
    }

    elapsedLevelMs = performance.now() - levelStartRealTime;
    if (deathFlashTimer > 0) deathFlashTimer--;
    if (hintTimer > 0) hintTimer--;
    if (echoFlashTimer > 0) echoFlashTimer--;
  }

  function finalizeEcho() {
    echoes.push({ frames: currentRecording });
    if (echoes.length > MAX_ECHOES) echoes.shift();
    currentRecording = [];
    cycleStep = 0;
    player.x = level.spawn.x;
    player.y = level.spawn.y;
    player.vx = 0; player.vy = 0;
    EL.Audio.play('echo');
    EL.Camera.shake(0.15);
    EL.Particles.spawnRing(player.x + player.w / 2, player.y + player.h / 2, { color: '#5aaaff', maxRadius: 60, life: 0.6, lineWidth: 3 });
    EL.Particles.spawnBurst(player.x + player.w / 2, player.y + player.h / 2, {
      color: '#5aaaff', count: 16, speed: 2.4, life: 0.5, size: 3,
    });
    echoFlashTimer = 40;
    emit('echoCreated', echoes.length);
  }

  function softResetRun(isDeath) {
    if (isDeath) {
      EL.Audio.play('death');
      EL.Camera.shake(0.45);
      EL.Particles.spawnBurst(player.x + player.w / 2, player.y + player.h / 2, {
        color: '#ff3b5c', count: 18, speed: 3, life: 0.5, size: 3, gravity: 0.05,
      });
      deathFlashTimer = 20;
    }
    currentRecording = [];
    cycleStep = 0;
    player.x = level.spawn.x;
    player.y = level.spawn.y;
    player.vx = 0; player.vy = 0;
  }

  function completeLevel() {
    levelComplete = true;
    running = false;
    const timeSec = elapsedLevelMs / 1000;
    const echoesUsed = echoes.length;
    const par = level.par;
    let stars = 1;
    if (timeSec <= par.time && echoesUsed <= par.echoes + 1) stars = 3;
    else if (timeSec <= par.time * 1.6) stars = 2;

    const save = EL.Save.get();
    const key = String(levelIndex);
    save.stars[key] = Math.max(save.stars[key] || 0, stars);
    save.bestTime[key] = Math.min(save.bestTime[key] ?? Infinity, timeSec);
    if (levelIndex + 1 >= save.unlocked && levelIndex + 1 < EL.Levels.length) save.unlocked = levelIndex + 2;
    if (save.unlocked > EL.Levels.length) save.unlocked = EL.Levels.length;
    EL.Save.persist();

    EL.Audio.play('success');
    EL.Camera.shake(0.3);
    for (let i = 0; i < 3; i++) {
      EL.Particles.spawnRing(level.exit.x + level.exit.w / 2, level.exit.y + level.exit.h / 2,
        { color: i === 0 ? '#b06bff' : i === 1 ? '#2ee6d6' : '#57ff9c', maxRadius: 70 + i * 20, life: 0.7 + i * 0.15, lineWidth: 3 });
    }
    EL.Particles.spawnBurst(level.exit.x + level.exit.w / 2, level.exit.y + level.exit.h / 2, {
      color: '#ffd166', count: 30, speed: 3.4, life: 0.9, size: 3.5, gravity: 0.08,
    });

    emit('levelComplete', { timeSec, echoesUsed, stars });
  }

  function togglePause() {
    if (levelComplete) return;
    paused = !paused;
    emit('pauseChanged', paused);
  }

  function requestEcho() {
    if (!running || paused || levelComplete || !level) return;
    if (cycleStep < 10) return; // avoid an accidental near-zero-length echo
    manualEchoRequested = true;
  }

  function restartRoom() { resetLevelState(); }

  function startLevel(idx) {
    resetLevelState(idx);
    running = true;
    paused = false;
  }

  function stop() { running = false; }

  return {
    on, emit,
    resetLevelState, fixedUpdate, togglePause, restartRoom, startLevel, stop, requestEcho,
    moverRect, getSolids,
    get level() { return level; },
    get levelIndex() { return levelIndex; },
    get cycleStep() { return cycleStep; },
    get STEPS_PER_CYCLE() { return STEPS_PER_CYCLE; },
    get player() { return player; },
    get echoes() { return echoes; },
    get boxStates() { return boxStates; },
    get doorOpen() { return doorOpen; },
    get laserOn() { return laserOn; },
    get buttonActive() { return buttonActive; },
    get running() { return running; },
    get paused() { return paused; },
    get levelComplete() { return levelComplete; },
    get elapsedLevelMs() { return elapsedLevelMs; },
    get deathFlashTimer() { return deathFlashTimer; },
    get hintTimer() { return hintTimer; },
    get echoFlashTimer() { return echoFlashTimer; },
    get FIXED_DT() { return FIXED_DT; },
    get WORLD_W() { return WORLD_W; },
    get WORLD_H() { return WORLD_H; },
    get MAX_ECHOES() { return MAX_ECHOES; },
  };
})();
