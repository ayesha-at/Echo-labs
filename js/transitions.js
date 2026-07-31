// ============================================================
// TRANSITIONS — full-canvas fade wipe used between rooms.
// play(onMid) fades to black, invokes onMid at the midpoint
// (swap level data here), then fades back in.
// ============================================================
window.EL = window.EL || {};

EL.Transitions = (function () {
  let active = false;
  let phase = null; // 'out' | 'in'
  let t = 0;
  const DURATION = 0.4;
  let onMid = null;

  function play(onMidCallback) {
    active = true;
    phase = 'out';
    t = 0;
    onMid = onMidCallback || null;
  }

  function update(dtSec) {
    if (!active) return;
    t += dtSec / DURATION;
    if (phase === 'out' && t >= 1) {
      t = 0;
      phase = 'in';
      if (onMid) { onMid(); onMid = null; }
    } else if (phase === 'in' && t >= 1) {
      active = false;
      phase = null;
    }
  }

  function alpha() {
    if (!active) return 0;
    const e = EL.Ease.easeInOutCubic(Math.min(1, t));
    return phase === 'out' ? e : 1 - e;
  }

  function isActive() { return active; }

  return { play, update, alpha, isActive };
})();
