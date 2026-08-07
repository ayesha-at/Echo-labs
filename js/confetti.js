// ============================================================
// CONFETTI — interactive canvas-confetti used by the
// game-complete celebration screen. Bursts on show and
// keeps gently raining while the screen is visible.
// ============================================================
window.EL = window.EL || {};

EL.Confetti = (function () {
  const PALETTE = ['#2ee6d6', '#b06bff', '#ff5fa2', '#ffd166', '#57ff9c', '#ff8a3d'];
  let canvas = null;
  let ctx = null;
  let particles = [];
  let active = false;
  let rafId = 0;
  let rainTimer = 0;
  let lastT = 0;

  function size() {
    if (!canvas) return { w: 800, h: 540 };
    return { w: canvas.clientWidth || 800, h: canvas.clientHeight || 540 };
  }

  function resize() {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const { w, h } = size();
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawn(initial, side) {
    if (!canvas) return;
    const { w, h } = size();
    const fromSide = side || null;
    const startX = fromSide === 'left' ? -10 : fromSide === 'right' ? w + 10 : Math.random() * w;
    const startY = fromSide ? h * (0.45 + Math.random() * 0.35) : -15 - Math.random() * 30;
    particles.push({
      x: startX,
      y: startY,
      vx: fromSide === 'left' ? 4 + Math.random() * 4 : fromSide === 'right' ? -(4 + Math.random() * 4) : (Math.random() - 0.5) * 4,
      vy: fromSide ? -2 + Math.random() * 3 : 1.2 + Math.random() * 2.6,
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 0.35,
      color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
      size: 5 + Math.random() * 7,
      h: 0.4 + Math.random() * 0.7,
      shape: Math.random() < 0.55 ? 'rect' : (Math.random() < 0.5 ? 'circle' : 'strip'),
    });
  }

  function tick(now) {
    if (!active) return;
    rafId = requestAnimationFrame(tick);
    const dt = lastT ? Math.min(0.05, (now - lastT) / 1000) : 1 / 60;
    lastT = now;
    const { w, h } = size();

    ctx.clearRect(0, 0, w, h);

    rainTimer -= dt;
    if (rainTimer <= 0) {
      const rate = particles.length < 30 ? 3 : 1;
      for (let i = 0; i < rate; i++) spawn(true);
      rainTimer = 0.18 + Math.random() * 0.22;
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.04;
      p.vx *= 0.995;
      p.rot += p.vrot;

      if (p.y > h + 30) { particles.splice(i, 1); continue; }
      if (p.x < -40 || p.x > w + 40) { particles.splice(i, 1); continue; }

      const fadeIn = Math.min(1, p.y / 20);
      const alpha = Math.max(0, Math.min(1, fadeIn));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      if (p.shape === 'rect') {
        ctx.fillRect(-p.size / 2, -p.size * p.h / 2, p.size, p.size * p.h);
      } else if (p.shape === 'strip') {
        ctx.fillRect(-p.size * 0.8, -1.5, p.size * 1.6, 3);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.shadowBlur = 0;
  }

  function start() {
    if (!canvas || !ctx) init();
    if (!canvas || !ctx) return;
    resize();
    active = true;
    lastT = 0;
    for (let i = 0; i < 180; i++) spawn(true);
    for (let i = 0; i < 40; i++) spawn(true, i % 2 ? 'right' : 'left');
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(tick);
  }

  function stop() {
    active = false;
    cancelAnimationFrame(rafId);
    particles = [];
    if (ctx && canvas) {
      const { w, h } = size();
      ctx.clearRect(0, 0, w, h);
    }
  }

  function init() {
    canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }

  function isActive() { return active; }

  return { init, start, stop, isActive };
})();