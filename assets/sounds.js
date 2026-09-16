// ============================================================
// MANGA SOUND ENGINE — Web Audio API, no external files
// ============================================================
(function () {
  const SFX_KEY = 'ovi_sfx_enabled';

  // Default OFF — user must explicitly turn on
  let sfxEnabled = localStorage.getItem(SFX_KEY) === 'true';
  let audioCtx = null;

  function getCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }

  // -- Core sound primitives ---------------------------------------------

  function playTone({ type = 'sine', freq = 440, endFreq, vol = 0.12, duration = 0.1, delay = 0 }) {
    if (!sfxEnabled) return;
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = type;
      const t = ctx.currentTime + delay;
      osc.frequency.setValueAtTime(freq, t);
      if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t + duration);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      osc.start(t); osc.stop(t + duration + 0.01);
    } catch (e) {}
  }

  function playNoise({ vol = 0.08, duration = 0.08, delay = 0, filterFreq = 2000 }) {
    if (!sfxEnabled) return;
    try {
      const ctx = getCtx();
      const bufSize = ctx.sampleRate * duration;
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = filterFreq;
      filter.Q.value = 0.8;
      const gain = ctx.createGain();
      const t = ctx.currentTime + delay;
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
      src.start(t); src.stop(t + duration + 0.01);
    } catch (e) {}
  }

  // -- Named sound effects -----------------------------------------------

  window.sfx_pageLoad = function () {
    playTone({ type: 'sawtooth', freq: 80, endFreq: 400, vol: 0.07, duration: 0.25 });
    playNoise({ vol: 0.15, duration: 0.2, filterFreq: 800 });
    playTone({ type: 'sine', freq: 120, endFreq: 40, vol: 0.18, duration: 0.3, delay: 0.15 });
    playTone({ type: 'square', freq: 900, endFreq: 200, vol: 0.05, duration: 0.08, delay: 0.3 });
  };

  window.sfx_menuOpen = function () {
    playNoise({ vol: 0.14, duration: 0.15, filterFreq: 1200 });
    playTone({ type: 'sawtooth', freq: 200, endFreq: 600, vol: 0.08, duration: 0.15 });
    playTone({ type: 'sine', freq: 440, endFreq: 880, vol: 0.06, duration: 0.1, delay: 0.1 });
  };

  window.sfx_menuClose = function () {
    playTone({ type: 'sawtooth', freq: 600, endFreq: 150, vol: 0.08, duration: 0.18 });
    playNoise({ vol: 0.1, duration: 0.12, filterFreq: 900 });
  };

  window.sfx_click = function () {
    playNoise({ vol: 0.18, duration: 0.04, filterFreq: 4000 });
    playTone({ type: 'square', freq: 1200, endFreq: 600, vol: 0.06, duration: 0.06 });
  };

  window.sfx_hover = function () {
    playTone({ type: 'sine', freq: 600, endFreq: 800, vol: 0.04, duration: 0.05 });
    playNoise({ vol: 0.04, duration: 0.03, filterFreq: 3000 });
  };

  window.sfx_linkClick = function () {
    playNoise({ vol: 0.2, duration: 0.05, filterFreq: 3500 });
    playTone({ type: 'square', freq: 880, endFreq: 220, vol: 0.08, duration: 0.1 });
  };

  window.sfx_voteYes = function () {
    playTone({ type: 'sine', freq: 440, endFreq: 880, vol: 0.12, duration: 0.12 });
    playTone({ type: 'sine', freq: 660, endFreq: 1320, vol: 0.08, duration: 0.1, delay: 0.08 });
    playNoise({ vol: 0.08, duration: 0.06, filterFreq: 2000, delay: 0.1 });
  };

  window.sfx_voteNo = function () {
    playTone({ type: 'sawtooth', freq: 300, endFreq: 80, vol: 0.14, duration: 0.2 });
    playNoise({ vol: 0.12, duration: 0.1, filterFreq: 500 });
  };

  window.sfx_swipe = function () {
    playNoise({ vol: 0.16, duration: 0.18, filterFreq: 1500 });
    playTone({ type: 'sawtooth', freq: 300, endFreq: 800, vol: 0.06, duration: 0.18 });
  };

  window.sfx_gameOver = function () {
    playTone({ type: 'sawtooth', freq: 440, endFreq: 110, vol: 0.14, duration: 0.4 });
    playNoise({ vol: 0.18, duration: 0.3, filterFreq: 400, delay: 0.1 });
    playTone({ type: 'sine', freq: 220, endFreq: 55, vol: 0.1, duration: 0.5, delay: 0.3 });
  };

  window.sfx_playAgain = function () {
    playTone({ type: 'sine', freq: 523, endFreq: 1046, vol: 0.1, duration: 0.1 });
    playTone({ type: 'sine', freq: 659, endFreq: 1318, vol: 0.08, duration: 0.1, delay: 0.1 });
    playTone({ type: 'sine', freq: 784, endFreq: 1568, vol: 0.06, duration: 0.12, delay: 0.2 });
  };

  // -- Helpers -----------------------------------------------------------

  function updateAllToggleBtns() {
    document.querySelectorAll('.sfx-toggle').forEach(function (btn) {
      btn.textContent = sfxEnabled ? '[ SFX ON ]' : '[ SFX OFF ]';
      btn.setAttribute('aria-pressed', sfxEnabled ? 'true' : 'false');
    });
  }

  // -- Sound toggle (saves to localStorage) -----------------------------

  window.toggleSfx = function () {
    sfxEnabled = !sfxEnabled;
    localStorage.setItem(SFX_KEY, sfxEnabled ? 'true' : 'false');
    updateAllToggleBtns();
    if (sfxEnabled) sfx_click(); // confirmation beep when turning ON
  };

  // -- Auto-attach to main site interactions -----------------------------

  document.addEventListener('DOMContentLoaded', function () {
    // Set initial button state from stored preference
    updateAllToggleBtns();

    // Page load sound (only if user has enabled it)
    setTimeout(sfx_pageLoad, 200);

    // Hover on interactive elements
    let lastHover = null;
    document.addEventListener('mouseover', function (e) {
      const el = e.target.closest('a, button, .menu-link, .page-btn, .skill-tag, .music-button, .theme-toggle, .menu-button');
      if (el && el !== lastHover) {
        lastHover = el;
        sfx_hover();
      }
    });
    document.addEventListener('mouseout', function (e) {
      const el = e.target.closest('a, button, .menu-link, .page-btn, .skill-tag, .music-button, .theme-toggle, .menu-button');
      if (el) lastHover = null;
    });

    // Clicks
    document.addEventListener('click', function (e) {
      const btn = e.target.closest('button, .page-btn, .menu-button, .music-button, .theme-toggle, .waifu-reload');
      const link = e.target.closest('a');
      const sfxBtn = e.target.closest('.sfx-toggle');
      if (sfxBtn) return; // handled by toggleSfx
      if (btn) sfx_click();
      else if (link) sfx_linkClick();
    });
  });

  // Patch toggleMenu to add sound
  const _origToggleMenu = window.toggleMenu;
  window.toggleMenu = function () {
    const menu = document.querySelector('.slide-menu');
    const isOpen = menu && menu.classList.contains('open');
    if (isOpen) sfx_menuClose(); else sfx_menuOpen();
    if (_origToggleMenu) _origToggleMenu();
  };

})();