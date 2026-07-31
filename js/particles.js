// ============================================================
// PARTICLES — lightweight particle pool.
// Two kinds: 'square' (dust/sparks/confetti) and 'ring'
// (expanding bloom pulses used for buttons, doors, echoes).
// ============================================================
window.EL = window.EL || {};

EL.Particles = (function () {
  const U = EL.Utils;
  let list = [];
  let ambientTimer = 0;

  function spawnBurst(x, y, opts) {
    const count = opts.count || 10;
    for (let i = 0; i < count; i++) {
      const angle = opts.angle !== undefined
        ? opts.angle + (Math.random() - 0.5) * (opts.spread !== undefined ? opts.spread : Math.PI * 2)
        : Math.random() * Math.PI * 2;
      const speed = (opts.speed || 2) * (0.5 + Math.random() * 0.9);
      list.push({
        type: 'square',
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: opts.life || 0.6,
        age: 0,
        size: opts.size || 3,
        color: opts.color || '#2ee6d6',
        gravity: opts.gravity !== undefined ? opts.gravity : 0,
      });
    }
  }

  function spawnRing(x, y, opts) {
    list.push({
      type: 'ring',
      x, y,
      life: opts.life || 0.5,
      age: 0,
      maxRadius: opts.maxRadius || 40,
      color: opts.color || '#2ee6d6',
      lineWidth: opts.lineWidth || 3,
    });
  }

  function spawnMote(w, h) {
    list.push({
      type: 'mote',
      x: Math.random() * w,
      y: h + 4,
      vx: (Math.random() - 0.5) * 0.15,
      vy: -(0.15 + Math.random() * 0.25),
      life: U.randRange(6, 11),
      age: 0,
      size: U.randRange(1, 2.2),
      color: Math.random() < 0.5 ? 'rgba(46,230,214,' : 'rgba(176,107,255,',
    });
  }

  function update(dtSec, worldW, worldH) {
    ambientTimer -= dtSec;
    if (ambientTimer <= 0) {
      spawnMote(worldW, worldH);
      ambientTimer = 0.5 + Math.random() * 0.6;
    }
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.age += dtSec;
      if (p.age >= p.life) { list.splice(i, 1); continue; }
      if (p.type === 'square' || p.type === 'mote') {
        p.vy += (p.gravity || 0) * dtSec * 60;
        p.x += p.vx;
        p.y += p.vy;
      }
    }
  }

  function draw(ctx) {
    for (const p of list) {
      const t = p.age / p.life;
      if (p.type === 'square') {
        const alpha = 1 - t;
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        const s = p.size * (1 - t * 0.4);
        ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
      } else if (p.type === 'ring') {
        const eased = EL.Ease.easeOutQuad(t);
        const r = eased * p.maxRadius;
        const alpha = 1 - t;
        ctx.globalAlpha = Math.max(0, alpha * 0.8);
        ctx.strokeStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 14;
        ctx.lineWidth = p.lineWidth;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.type === 'mote') {
        const alpha = Math.sin(Math.PI * t) * 0.5;
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.fillStyle = p.color + '1)';
        ctx.shadowBlur = 0;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  function clear() { list = []; }

  return { spawnBurst, spawnRing, update, draw, clear };
})();
