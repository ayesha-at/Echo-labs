// ============================================================
// RENDER — all canvas drawing. Applies camera shake offset,
// draws particles, pulsing bloom glows, and the transition wipe.
// ============================================================
window.EL = window.EL || {};

EL.Render = (function () {
  let ctx = null;
  const E = EL.Engine;

  function init(context) { ctx = context; }

  function glow(color, blur) { ctx.shadowColor = color; ctx.shadowBlur = blur; }
  function noGlow() { ctx.shadowBlur = 0; }

  function drawScene() {
    const level = E.level;
    if (!level) return;
    const W = E.WORLD_W, H = E.WORLD_H;
    const t = (E.cycleStep * E.FIXED_DT) / 1000;

    ctx.save();
    const shake = EL.Camera.getOffset();
    ctx.translate(shake.dx, shake.dy);

    ctx.clearRect(-20, -20, W + 40, H + 40);
    ctx.fillStyle = '#05060f';
    ctx.fillRect(-20, -20, W + 40, H + 40);

    // grid backdrop
    ctx.strokeStyle = 'rgba(80,90,160,0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // ambient background particles (motes) render behind everything
    EL.Particles.draw(ctx);

    // platforms
    level.platforms.forEach((p) => {
      ctx.fillStyle = '#171a33';
      ctx.fillRect(p.x, p.y, p.w, p.h);
      glow('#2ee6d6', 6);
      ctx.strokeStyle = 'rgba(46,230,214,0.7)';
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x + 1, p.y + 1, p.w - 2, p.h - 2);
      noGlow();
    });

    // movers
    level.movers.forEach((m) => {
      const r = E.moverRect(m, t);
      ctx.fillStyle = '#241a3d';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      glow('#b06bff', 10);
      ctx.strokeStyle = '#b06bff';
      ctx.lineWidth = 2;
      ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
      noGlow();
    });

    // doors
    level.doors.forEach((d) => {
      const open = E.doorOpen[d.id];
      ctx.fillStyle = open ? 'rgba(87,255,156,0.12)' : 'rgba(255,95,162,0.18)';
      ctx.fillRect(d.x, d.y, d.w, d.h);
      const pulse = 8 + Math.sin(performance.now() * 0.004) * 3;
      glow(open ? '#57ff9c' : '#ff5fa2', open ? pulse + 6 : 8);
      ctx.strokeStyle = open ? '#57ff9c' : '#ff5fa2';
      ctx.lineWidth = 2;
      ctx.strokeRect(d.x, d.y, d.w, d.h);
      noGlow();
    });

    // buttons (bloom pulse while held)
    level.buttons.forEach((b) => {
      const active = E.buttonActive[b.id];
      const pulse = active ? 12 + Math.sin(performance.now() * 0.01) * 4 : 4;
      ctx.fillStyle = active ? '#57ff9c' : '#1c3a2c';
      glow(active ? '#57ff9c' : '#2ee6d6', pulse);
      ctx.fillRect(b.x, b.y, b.w, b.h);
      noGlow();
    });

    // boxes
    E.boxStates.forEach((b) => {
      ctx.fillStyle = '#3a3f66';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      glow('#8b90c9', 6);
      ctx.strokeStyle = '#8b90c9';
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
      noGlow();
    });

    // lasers
    level.lasers.forEach((l) => {
      if (!E.laserOn[l.id]) return;
      const flicker = 10 + Math.sin(performance.now() * 0.02 + l.x1) * 3;
      glow('#ff3b5c', flicker);
      ctx.strokeStyle = '#ff3b5c';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(l.x1, l.y1);
      ctx.lineTo(l.x2, l.y2);
      ctx.stroke();
      noGlow();
    });

    // exit — breathing bloom pulse via easing
    const breathe = (Math.sin(t * 2.2) + 1) / 2; // 0..1
    const eased = EL.Ease.easeInOutCubic(breathe);
    glow('#b06bff', 10 + eased * 14);
    ctx.fillStyle = `rgba(176,107,255,${0.2 + eased * 0.15})`;
    ctx.fillRect(level.exit.x, level.exit.y, level.exit.w, level.exit.h);
    ctx.strokeStyle = '#b06bff';
    ctx.lineWidth = 2;
    ctx.strokeRect(level.exit.x, level.exit.y, level.exit.w, level.exit.h);
    noGlow();

    // foreground particles (bursts/rings on top of world geometry)
    EL.Particles.draw(ctx);

    // echoes
    E.echoes.forEach((echo, i) => {
      const f = echo.frames[Math.min(E.cycleStep, echo.frames.length - 1)];
      if (!f) return;
      drawCharacter(f.x, f.y, f.w, f.h, f.facing, `rgba(90,170,255,${0.55 - i * 0.05})`, '#5aaaff', f.interacting);
    });

    // live player
    const flashRed = E.deathFlashTimer > 0 && Math.floor(E.deathFlashTimer / 4) % 2 === 0;
    drawCharacter(E.player.x, E.player.y, E.player.w, E.player.h, E.player.facing,
      flashRed ? 'rgba(255,59,92,0.9)' : '#2ee6d6', flashRed ? '#ff3b5c' : '#2ee6d6', EL.Input.interact());

    // "new echo" flash text with easeOutBack pop-in
    if (E.echoFlashTimer > 0) {
      const progress = 1 - E.echoFlashTimer / 40;
      const scale = EL.Ease.easeOutBack(Math.min(1, progress * 2));
      ctx.save();
      ctx.translate(W / 2, 40);
      ctx.scale(scale, scale);
      ctx.font = 'bold 16px monospace';
      ctx.fillStyle = `rgba(255,95,162,${Math.min(1, E.echoFlashTimer / 20)})`;
      ctx.textAlign = 'center';
      ctx.fillText('NEW ECHO CREATED', 0, 0);
      ctx.restore();
      ctx.textAlign = 'left';
    }

    ctx.restore(); // undo shake translate

    // transition wipe (drawn in screen space, unaffected by shake)
    const a = EL.Transitions.alpha();
    if (a > 0) {
      ctx.fillStyle = `rgba(5,6,15,${a})`;
      ctx.fillRect(0, 0, W, H);
      // thin scanline flicker for a glitchy feel
      if (a > 0.15) {
        ctx.strokeStyle = `rgba(46,230,214,${a * 0.5})`;
        ctx.lineWidth = 2;
        const lineY = (Math.sin(performance.now() * 0.05) * 0.5 + 0.5) * H;
        ctx.beginPath(); ctx.moveTo(0, lineY); ctx.lineTo(W, lineY); ctx.stroke();
      }
    }
  }

  function drawCharacter(x, y, w, h, facing, fillColor, glowColor, interacting) {
    glow(glowColor, 10);
    ctx.fillStyle = fillColor;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    noGlow();
    ctx.fillStyle = '#05060f';
    const eyeX = facing === 1 ? x + w - 9 : x + 3;
    ctx.fillRect(eyeX, y + 8, 6, 5);
    if (interacting) {
      const pulse = 8 + Math.sin(performance.now() * 0.02) * 4;
      glow('#ffd166', pulse);
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 3, y - 3, w + 6, h + 6);
      noGlow();
    }
  }

  return { init, drawScene };
})();
