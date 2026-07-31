// ============================================================
// UI — DOM screen management, HUD, menus, and the level-complete
// star reveal animation. Wires user input to EL.Engine.
// ============================================================
window.EL = window.EL || {};

EL.UI = (function () {
  const E = EL.Engine;

  const screens = {
    menu: document.getElementById('screen-menu'),
    levels: document.getElementById('screen-levels'),
    settings: document.getElementById('screen-settings'),
    credits: document.getElementById('screen-credits'),
    game: document.getElementById('screen-game'),
  };

  function showScreen(name) {
    Object.entries(screens).forEach(([key, el]) => {
      if (key === name) {
        el.classList.remove('hidden');
        el.classList.remove('screen-enter');
        // retrigger the CSS entrance animation
        void el.offsetWidth;
        el.classList.add('screen-enter');
      } else {
        el.classList.add('hidden');
      }
    });
  }

  function buildLevelGrid() {
    const save = EL.Save.get();
    const grid = document.getElementById('level-grid');
    grid.innerHTML = '';
    EL.Levels.forEach((lvl, i) => {
      const locked = i >= save.unlocked;
      const btn = document.createElement('button');
      btn.className = 'level-tile' + (locked ? ' locked' : '');
      const starCount = save.stars[String(i)] || 0;
      btn.innerHTML = `${i + 1}<span class="stars-mini">${locked ? '🔒' : '★'.repeat(starCount) + '☆'.repeat(3 - starCount)}</span>`;
      if (!locked) btn.addEventListener('click', () => goToLevel(i));
      grid.appendChild(btn);
    });
  }

  function goToLevel(i) {
    showScreen('game');
    EL.Transitions.play(() => {
      E.startLevel(i);
      document.getElementById('hud-level').textContent = E.level.name;
      document.getElementById('hint-banner').textContent = E.level.hint;
      document.getElementById('hint-banner').classList.remove('hidden');
      document.getElementById('level-complete-overlay').classList.add('hidden');
      document.getElementById('pause-overlay').classList.add('hidden');
      EL.Audio.startMusic();
    });
  }

  function revealStars(stars) {
    const container = document.getElementById('lc-stars');
    container.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const span = document.createElement('span');
      span.className = i < stars ? 'lit star-pop' : '';
      span.textContent = i < stars ? '★' : '☆';
      span.style.animationDelay = `${i * 0.15}s`;
      container.appendChild(span);
    }
  }

  function bindEngineEvents() {
    E.on('levelComplete', ({ timeSec, echoesUsed, stars }) => {
      const mm = Math.floor(timeSec / 60).toString().padStart(2, '0');
      const ss = Math.floor(timeSec % 60).toString().padStart(2, '0');
      document.getElementById('lc-time').textContent = `Time: ${mm}:${ss}`;
      document.getElementById('lc-echoes').textContent = `Echoes Used: ${echoesUsed}`;
      revealStars(stars);
      document.getElementById('level-complete-overlay').classList.remove('hidden');
    });
    E.on('pauseChanged', (paused) => {
      document.getElementById('pause-overlay').classList.toggle('hidden', !paused);
    });
  }

  function bindButtons() {
    document.querySelectorAll('[data-action]').forEach((el) => {
      el.addEventListener('click', () => {
        const save = EL.Save.get();
        switch (el.dataset.action) {
          case 'play':
            goToLevel(Math.min(save.unlocked - 1, EL.Levels.length - 1));
            break;
          case 'levels':
            buildLevelGrid();
            showScreen('levels');
            break;
          case 'settings':
            showScreen('settings');
            break;
          case 'credits':
            showScreen('credits');
            break;
          case 'back-to-menu':
            showScreen('menu');
            break;
          case 'reset-progress':
            EL.Save.reset();
            buildLevelGrid();
            break;
          case 'resume':
            E.togglePause();
            break;
          case 'restart-room':
            E.restartRoom();
            document.getElementById('hint-banner').textContent = E.level.hint;
            document.getElementById('hint-banner').classList.remove('hidden');
            document.getElementById('pause-overlay').classList.add('hidden');
            break;
          case 'quit-to-menu':
            E.stop();
            EL.Audio.stopMusic();
            showScreen('menu');
            break;
          case 'replay-level':
            goToLevel(E.levelIndex);
            break;
          case 'next-level':
            if (E.levelIndex + 1 < EL.Levels.length) goToLevel(E.levelIndex + 1);
            else { E.stop(); EL.Audio.stopMusic(); showScreen('menu'); }
            break;
        }
      });
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyR' && E.running && !E.paused && !E.levelComplete) {
        E.restartRoom();
        document.getElementById('hint-banner').textContent = E.level.hint;
        document.getElementById('hint-banner').classList.remove('hidden');
      }
      if (e.code === 'Escape' && !screens.game.classList.contains('hidden')) E.togglePause();
    });

    document.getElementById('sfx-volume').addEventListener('input', (e) => {
      EL.Audio.setSfxVolume(Number(e.target.value) / 100);
    });
    document.getElementById('music-volume').addEventListener('input', (e) => {
      EL.Audio.setMusicVolume(Number(e.target.value) / 100);
    });
  }

  function updateHud() {
    if (!E.level) return;
    const secondsLeft = Math.max(0, Math.ceil(E.level.cycleSeconds - (E.cycleStep * E.FIXED_DT) / 1000));
    document.getElementById('hud-timer').textContent = secondsLeft;
    document.getElementById('hud-echoes').textContent = `Echoes: ${E.echoes.length} / ${E.MAX_ECHOES}`;
    if (E.hintTimer <= 0) document.getElementById('hint-banner').classList.add('hidden');
  }

  function init() {
    bindEngineEvents();
    bindButtons();
    showScreen('menu');
  }

  return { init, showScreen, updateHud };
})();
