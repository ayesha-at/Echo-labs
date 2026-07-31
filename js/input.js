// ============================================================
// INPUT — keyboard state tracking
// ============================================================
window.EL = window.EL || {};

EL.Input = (function () {
  const keys = {};
  const PREVENT_DEFAULT = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

  window.addEventListener('keydown', (e) => {
    if (PREVENT_DEFAULT.includes(e.code)) e.preventDefault();
    const wasDown = keys[e.code];
    keys[e.code] = true;
    if (!wasDown) EL.Input._dispatchKeyDown(e.code);
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });

  const downListeners = [];
  function onKeyDown(fn) { downListeners.push(fn); }
  function _dispatchKeyDown(code) { downListeners.forEach((fn) => fn(code)); }

  function isDown(code) { return !!keys[code]; }
  function left() { return keys['KeyA'] || keys['ArrowLeft']; }
  function right() { return keys['KeyD'] || keys['ArrowRight']; }
  function jump() { return keys['Space'] || keys['KeyW'] || keys['ArrowUp']; }
  function interact() { return keys['KeyE']; }

  return { isDown, left, right, jump, interact, onKeyDown, _dispatchKeyDown };
})();
