/**
 * music.js — site-wide persistent music player.
 *
 * Owns the single <audio> element for the whole site. A live audio element
 * cannot survive a full page load, so playback state and position are saved to
 * sessionStorage and restored on the next page. sessionStorage lasts for the
 * browsing session only, so closing the browser clears it; a refresh is cleared
 * explicitly. Browsers block autoplay without a user gesture, so a blocked
 * resume is deferred to the first interaction.
 *
 * Pages that already have the in-menu player (the homepage) drive this module
 * instead of getting a floating control.
 */
(function () {
  'use strict';

  if (window.OviMusic) return;

  var SRC = 'https://ik.imagekit.io/iamovi/Dr.Dog-Where_d%20All%20The%20Time%20Go.mp3';
  var TITLE = "Where'd All The Time Go? \u2014 Dr. Dog";

  var K_POS = 'ovi_music_pos';
  var K_PLAYING = 'ovi_music_playing';
  var K_AT = 'ovi_music_saved_at';
  var K_ACTIVE = 'ovi_music_active';

  var MAX_GAP = 3;    // seconds of wall clock credited to the page load
  var SAVE_MS = 1000; // sessionStorage write throttle

  var audio = null;
  var playing = false;
  var resumePos = 0;
  var subscribers = [];
  var lastSave = 0;
  var uiTimer = null;
  var gestureArmed = false;

  // sessionStorage, not localStorage: the state should last for the browsing
  // session (across page navigations) but not past the browser being closed.
  // A refresh is cleared explicitly in init().
  function read(key) {
    try { return sessionStorage.getItem(key); } catch (e) { return null; }
  }

  function write(key, val) {
    try { sessionStorage.setItem(key, val); } catch (e) {}
  }

  function emit() {
    var state = {
      playing: playing,
      currentTime: audio ? audio.currentTime : 0,
      duration: (audio && isFinite(audio.duration)) ? audio.duration : 0
    };
    for (var i = 0; i < subscribers.length; i++) {
      try { subscribers[i](state); } catch (e) {}
    }
  }

  function save() {
    if (!audio) return;
    write(K_POS, String(audio.currentTime || 0));
    write(K_PLAYING, playing ? 'true' : 'false');
    write(K_AT, String(Date.now()));
    lastSave = Date.now();
  }

  function startUI() { if (!uiTimer) uiTimer = setInterval(emit, 100); }
  function stopUI() { if (uiTimer) { clearInterval(uiTimer); uiTimer = null; } }

  function disarmGestureResume() {
    if (!gestureArmed) return;
    gestureArmed = false;
    document.removeEventListener('pointerdown', onGesture);
    document.removeEventListener('keydown', onGesture);
    document.removeEventListener('touchstart', onGesture);
  }

  function onGesture(ev) {
    disarmGestureResume();
    var t = ev.target;
    // Let the music controls handle their own click. Auto-resuming here would
    // play on pointerdown and then the control's click would pause it again.
    if (t && t.closest && (t.closest('.ovi-music') || t.closest('.music-button'))) return;
    play();
  }

  function armGestureResume() {
    if (gestureArmed) return;
    gestureArmed = true;
    document.addEventListener('pointerdown', onGesture, { passive: true });
    document.addEventListener('keydown', onGesture);
    document.addEventListener('touchstart', onGesture, { passive: true });
  }

  // `playing` mirrors the element's real state (driven by the play/pause events
  // below), never an optimistic guess. A blocked autoplay rejects without firing
  // `play`, so the state stays truthful and the control's first click starts it.
  function play() {
    if (!audio) return;
    write(K_ACTIVE, 'true');
    var p = audio.play();
    if (p && typeof p.catch === 'function') {
      p.catch(function () { armGestureResume(); });
    }
  }

  function pause() {
    if (!audio) return;
    audio.pause();
  }

  function toggle() {
    disarmGestureResume();
    if (playing) { pause(); } else { play(); }
  }

  function seek(ratio) {
    if (!audio || !isFinite(audio.duration) || !audio.duration) return;
    audio.currentTime = Math.max(0, Math.min(1, ratio)) * audio.duration;
    save();
    emit();
  }

  // A refresh (F5 / reload) starts fresh: position back to 0, not playing.
  // Link navigation reports `navigate`, so cross-page playback is unaffected.
  function isReload() {
    try {
      var entries = performance.getEntriesByType && performance.getEntriesByType('navigation');
      if (entries && entries[0] && entries[0].type) return entries[0].type === 'reload';
      if (performance.navigation) return performance.navigation.type === 1;
    } catch (e) {}
    return false;
  }

  function init() {
    var savedPos = parseFloat(read(K_POS)) || 0;
    var wasPlaying = read(K_PLAYING) === 'true';
    var savedAt = parseInt(read(K_AT), 10) || 0;
    var active = read(K_ACTIVE) === 'true';

    if (isReload()) {
      savedPos = 0;
      wasPlaying = false;
      savedAt = 0;
      active = false;
      write(K_POS, '0');
      write(K_PLAYING, 'false');
      write(K_AT, '0');
      write(K_ACTIVE, 'false');
    }

    audio = new Audio(SRC);
    audio.loop = true;
    audio.preload = (active || wasPlaying) ? 'auto' : 'metadata';

    resumePos = savedPos;
    if (wasPlaying && savedAt) {
      resumePos += Math.min((Date.now() - savedAt) / 1000, MAX_GAP);
    }

    audio.addEventListener('loadedmetadata', function () {
      if (resumePos > 0 && isFinite(audio.duration)) {
        try {
          audio.currentTime = Math.min(resumePos, Math.max(0, audio.duration - 0.5));
        } catch (e) {}
      }
      emit();
    });

    audio.addEventListener('timeupdate', function () {
      if (Date.now() - lastSave > SAVE_MS) save();
    });

    audio.addEventListener('play', function () { playing = true; startUI(); save(); emit(); });
    audio.addEventListener('pause', function () { playing = false; stopUI(); save(); emit(); });

    window.addEventListener('pagehide', save);
    window.addEventListener('beforeunload', save);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') save();
    });

    if (wasPlaying) play();
    emit();
  }

  function mountFloatingControl() {
    if (document.querySelector('.music-button')) return; // homepage menu owns the UI
    if (document.querySelector('.ovi-music')) return;    // already mounted
    if (read(K_ACTIVE) !== 'true') return;               // never started: nothing to control

    var style = document.createElement('style');
    style.id = 'ovi-music-style';
    style.textContent = [
      '.ovi-music{position:fixed;left:14px;bottom:14px;z-index:900;display:flex;align-items:center;gap:10px;',
      'padding:8px 12px 8px 8px;background:var(--paper);color:var(--ink);border:2px solid var(--ink);',
      'box-shadow:2px 2px 0 var(--ink);font-family:\'Share Tech Mono\',monospace;',
      'max-width:min(280px,calc(100vw - 28px));}',
      '.ovi-music-btn{display:flex;align-items:center;justify-content:center;width:30px;height:30px;flex:0 0 auto;',
      'padding:0;background:transparent;border:2px solid var(--ink);color:var(--ink);cursor:pointer;',
      'transition:background var(--speed),color var(--speed);}',
      '.ovi-music-btn:hover{background:var(--ink);color:var(--paper);}',
      '.ovi-music-btn svg{width:14px;height:14px;}',
      '.ovi-music-meta{min-width:0;flex:1 1 auto;}',
      '.ovi-music-title{display:block;font-size:10px;letter-spacing:0.03em;color:var(--ink-mid);',
      'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.ovi-music-track{margin-top:5px;height:5px;background:var(--paper-dark);border:1px solid var(--ink);',
      'cursor:pointer;position:relative;overflow:hidden;}',
      '.ovi-music-fill{height:100%;width:0%;background:var(--ink);transition:width 0.1s linear;}',
      '@media (max-width:600px){.ovi-music{left:10px;bottom:10px;}.ovi-music-title{display:none;}}',
      '@media (prefers-reduced-motion:reduce){.ovi-music-fill{transition:none;}}'
    ].join('');

    var root = document.createElement('div');
    root.className = 'ovi-music';
    root.setAttribute('role', 'group');
    root.setAttribute('aria-label', 'Music player');
    root.innerHTML =
      '<button class="ovi-music-btn" type="button" aria-label="Play" aria-pressed="false">' +
        '<svg class="ovi-ic-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>' +
        '<svg class="ovi-ic-pause" viewBox="0 0 24 24" aria-hidden="true" style="display:none"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" fill="currentColor"/></svg>' +
      '</button>' +
      '<div class="ovi-music-meta">' +
        '<span class="ovi-music-title"></span>' +
        '<div class="ovi-music-track" role="slider" aria-label="Seek" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">' +
          '<div class="ovi-music-fill"></div>' +
        '</div>' +
      '</div>';

    var title = root.querySelector('.ovi-music-title');
    title.textContent = TITLE;

    document.head.appendChild(style);
    document.body.appendChild(root);

    var btn = root.querySelector('.ovi-music-btn');
    var track = root.querySelector('.ovi-music-track');
    var fill = root.querySelector('.ovi-music-fill');
    var icPlay = root.querySelector('.ovi-ic-play');
    var icPause = root.querySelector('.ovi-ic-pause');

    btn.addEventListener('click', toggle);
    track.addEventListener('click', function (e) {
      var rect = track.getBoundingClientRect();
      if (rect.width) seek((e.clientX - rect.left) / rect.width);
    });

    window.OviMusic.onChange(function (s) {
      btn.setAttribute('aria-pressed', s.playing ? 'true' : 'false');
      btn.setAttribute('aria-label', s.playing ? 'Pause' : 'Play');
      icPlay.style.display = s.playing ? 'none' : 'block';
      icPause.style.display = s.playing ? 'block' : 'none';
      fill.style.width = s.duration ? ((s.currentTime / s.duration) * 100) + '%' : '0%';
      track.setAttribute('aria-valuenow', s.duration ? Math.round((s.currentTime / s.duration) * 100) : 0);
    });
  }

  window.OviMusic = {
    src: SRC,
    title: TITLE,
    toggle: toggle,
    play: play,
    pause: pause,
    seek: seek,
    isPlaying: function () { return playing; },
    getAudio: function () { return audio; },
    onChange: function (cb) {
      subscribers.push(cb);
      return function () {
        var i = subscribers.indexOf(cb);
        if (i > -1) subscribers.splice(i, 1);
      };
    }
  };

  function boot() {
    init();
    mountFloatingControl();
    try {
      window.dispatchEvent(new CustomEvent('ovi-music-ready'));
    } catch (e) {}
  }

  // A page restored from the back/forward cache is a frozen snapshot: this
  // script never re-runs, so it can keep a stale "no control" state from before
  // the song was first played. Re-check on pageshow and mount if now needed.
  window.addEventListener('pageshow', function (ev) {
    if (!ev.persisted) return;
    mountFloatingControl();
    emit();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
