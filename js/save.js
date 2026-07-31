// ============================================================
// SAVE — localStorage-backed autosave of progress
// ============================================================
window.EL = window.EL || {};

EL.Save = (function () {
  const KEY = 'echoLabs.save.v1';

  function fresh() { return { unlocked: 1, stars: {}, bestTime: {} }; }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return fresh();
      const parsed = JSON.parse(raw);
      return { ...fresh(), ...parsed };
    } catch (e) {
      return fresh();
    }
  }

  let data = load();

  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
  }
  function get() { return data; }
  function reset() { data = fresh(); persist(); }

  return { get, persist, reset };
})();
