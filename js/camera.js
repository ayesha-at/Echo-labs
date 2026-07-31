// ============================================================
// CAMERA — trauma-based screen shake. Call shake(amount) on
// impactful events; add trauma decays back to 0 automatically.
// ============================================================
window.EL = window.EL || {};

EL.Camera = (function () {
  let trauma = 0;
  const DECAY_PER_SEC = 1.8;
  const MAX_OFFSET = 10;

  function shake(amount) { trauma = Math.min(1, trauma + amount); }
  function update(dtSec) { trauma = Math.max(0, trauma - DECAY_PER_SEC * dtSec); }

  function getOffset() {
    if (trauma <= 0) return { dx: 0, dy: 0 };
    const t = trauma * trauma; // squared falloff = punchier near the peak
    return {
      dx: (Math.random() * 2 - 1) * MAX_OFFSET * t,
      dy: (Math.random() * 2 - 1) * MAX_OFFSET * t,
    };
  }

  return { shake, update, getOffset };
})();
