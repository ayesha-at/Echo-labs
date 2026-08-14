// ============================================================
// TOUCH CONTROLS — on-screen D-pad/jump/action buttons for
// mobile & tablet. Rather than plumbing a separate input path
// through the engine, each button just dispatches the same
// KeyboardEvents the game already listens for (EL.Input,
// EL.UI's R/Q/Escape handlers). That keeps this file fully
// decoupled: it can be deleted with zero impact on desktop play.
// ============================================================
window.EL = window.EL || {};

(function () {
  function isTouchCapable() {
    return ('ontouchstart' in window) ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0;
  }

  function fireKey(type, code) {
    window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
  }

  // Held button (left/right/jump/interact): keydown on press, keyup on
  // release. Pointer capture locks this pointer's events to the button it
  // started on — without it, a finger that slides off the button (very easy
  // to do mid-jump) fires pointerleave and drops the key early, or worse,
  // never fires pointerup at all on some Android WebViews, leaving the key
  // stuck "down" forever.
  function bindHold(btn, code) {
    if (!btn) return;
    let activePointerId = null;
    const press = (e) => {
      e.preventDefault();
      if (activePointerId !== null) return; // already held by another pointer
      activePointerId = e.pointerId;
      if (btn.setPointerCapture) {
        try { btn.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
      }
      btn.classList.add('active');
      fireKey('keydown', code);
    };
    const release = (e) => {
      if (e && e.pointerId !== undefined && e.pointerId !== activePointerId) return;
      if (e) e.preventDefault();
      activePointerId = null;
      btn.classList.remove('active');
      fireKey('keyup', code);
    };
    btn.addEventListener('pointerdown', press);
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('lostpointercapture', release);
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // One-shot button (restart/pause): a single keydown is enough, they're
  // handled as edge-triggered actions elsewhere in the code. Still uses
  // pointer capture so a drag-off doesn't leave the button stuck "active".
  function bindTap(btn, code) {
    if (!btn) return;
    const press = (e) => {
      e.preventDefault();
      if (btn.setPointerCapture) {
        try { btn.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
      }
      btn.classList.add('active');
      fireKey('keydown', code);
    };
    const release = (e) => {
      if (e) e.preventDefault();
      btn.classList.remove('active');
      fireKey('keyup', code);
    };
    btn.addEventListener('pointerdown', press);
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('lostpointercapture', release);
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  function init() {
    const controls = document.getElementById('touch-controls');
    if (!controls) return;

    if (isTouchCapable()) {
      document.body.classList.add('touch-device');
      controls.classList.remove('hidden');
    }

    bindHold(document.getElementById('touch-left'), 'ArrowLeft');
    bindHold(document.getElementById('touch-right'), 'ArrowRight');
    bindHold(document.getElementById('touch-jump'), 'Space');
    bindHold(document.getElementById('touch-interact'), 'KeyE');
    bindTap(document.getElementById('touch-restart'), 'KeyR');
    bindTap(document.getElementById('touch-pause'), 'Escape');

    // Hide the movement/jump controls while a pause or level-complete
    // overlay is covering the canvas so they don't sit under it and
    // eat taps meant for the overlay's own buttons.
    if (EL.Engine) {
      const playControls = [
        document.getElementById('touch-dpad'),
        document.getElementById('touch-jump'),
        document.getElementById('touch-interact'),
      ];
      const setPlayControlsVisible = (visible) => {
        playControls.forEach((el) => {
          if (el) el.classList.toggle('hidden', !visible);
        });
      };
      EL.Engine.on('pauseChanged', (paused) => setPlayControlsVisible(!paused));
      EL.Engine.on('levelComplete', () => setPlayControlsVisible(false));
      EL.Engine.on('levelReset', () => setPlayControlsVisible(true));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
