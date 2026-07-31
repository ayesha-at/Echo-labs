// ============================================================
// MAIN — bootstraps the canvas and runs the fixed-timestep loop
// tying together Engine (simulation), Particles/Camera/Transitions
// (juice), and Render (drawing) each frame.
// ============================================================
window.EL = window.EL || {};

(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  EL.Render.init(ctx);
  EL.UI.init();

  const FIXED_DT = EL.Engine.FIXED_DT;
  let lastTime = 0;
  let accumulator = 0;

  function loop(now) {
    requestAnimationFrame(loop);

    let delta = now - lastTime;
    lastTime = now;
    if (delta > 250) delta = 250; // avoid spiral of death after tab-switch
    const deltaSec = delta / 1000;

    if (EL.Engine.running) {
      accumulator += delta;
      while (accumulator >= FIXED_DT) {
        EL.Engine.fixedUpdate();
        accumulator -= FIXED_DT;
      }
    }

    // juice systems always tick so effects finish smoothly even when paused
    EL.Camera.update(deltaSec);
    EL.Particles.update(deltaSec, EL.Engine.WORLD_W, EL.Engine.WORLD_H);
    EL.Transitions.update(deltaSec);

    if (EL.Engine.level) {
      EL.Render.drawScene();
      EL.UI.updateHud();
    }
  }

  requestAnimationFrame((t) => { lastTime = t; requestAnimationFrame(loop); });
})();
