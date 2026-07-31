// ============================================================
// UTILS — small shared math & collision helpers
// ============================================================
window.EL = window.EL || {};

EL.Utils = (function () {
  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function randRange(min, max) { return min + Math.random() * (max - min); }
  function randSign() { return Math.random() < 0.5 ? -1 : 1; }

  return { rectsOverlap, clamp, lerp, randRange, randSign };
})();
