// ============================================================
// AUDIO — sfx/music loading with graceful fallback if files
// are missing, plus volume control
// ============================================================
window.EL = window.EL || {};

EL.Audio = (function () {
  const bank = { jump: null, interact: null, echo: null, success: null, death: null, music: null };
  let sfxVolume = 0.7, musicVolume = 0.35;

  function tryLoad(key, src) {
    const a = new Audio();
    a.src = src;
    a.addEventListener('error', () => { bank[key] = null; });
    bank[key] = a;
  }

  function init() {
    tryLoad('jump', 'assets/jump.wav');
    tryLoad('interact', 'assets/interact.wav');
    tryLoad('echo', 'assets/echo.wav');
    tryLoad('success', 'assets/success.wav');
    tryLoad('death', 'assets/death.wav');
    tryLoad('music', 'assets/ambient.mp3');
    if (bank.music) bank.music.loop = true;
  }

  function play(key) {
    const a = bank[key];
    if (!a) return;
    try {
      const clone = a.cloneNode();
      clone.volume = sfxVolume;
      clone.play().catch(() => {});
    } catch (e) { /* ignore */ }
  }

  function setSfxVolume(v) { sfxVolume = v; }
  function setMusicVolume(v) { musicVolume = v; if (bank.music) bank.music.volume = musicVolume; }
  function startMusic() { if (bank.music) { bank.music.currentTime = 0; bank.music.volume = musicVolume; bank.music.play().catch(() => {}); } }
  function stopMusic() { if (bank.music) bank.music.pause(); }

  init();
  return { play, setSfxVolume, setMusicVolume, startMusic, stopMusic };
})();
