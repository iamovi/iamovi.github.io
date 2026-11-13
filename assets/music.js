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
 * instead of getting a floating control. The floating control is a draggable
 * play/pause pill with a time readout; its position is remembered per session.
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
  var K_X = 'ovi_music_x';
  var K_Y = 'ovi_music_y';

  var MAX_GAP = 3;    // seconds of wall clock credited to the page load
  var SAVE_MS = 1000; // sessionStorage write throttle

  var audio = null;
  var playing = false;
  var intent = false; // what the user asked for; survives browser-forced pauses
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

  // Seconds to "m:ss" (hours only when needed), for the time readout.
  function clock(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    sec = Math.floor(sec);
    var h = Math.floor(sec / 3600);
    var m = Math.floor((sec % 3600) / 60);
    var s = sec % 60;
    var mm = (h > 0 && m < 10 ? '0' : '') + m;
    return (h > 0 ? h + ':' : '') + mm + ':' + (s < 10 ? '0' : '') + s;
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
    // Persist the user's intent, not the live flag: the browser fires a pause
    // while freezing a page for the back/forward cache, and that must not be
    // mistaken for the user pausing.
    write(K_PLAYING, intent ? 'true' : 'false');
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
    intent = true;
    write(K_ACTIVE, 'true');
    var p = audio.play();
    if (p && typeof p.catch === 'function') {
      p.catch(function () { armGestureResume(); });
    }
  }

  function pause() {
    if (!audio) return;
    intent = false;
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

  // Re-adopt the saved state onto the already-created audio element. Used when a
  // page comes back from the back/forward cache: the browser pauses media while
  // frozen, so without this the restored page would sit silent even though the
  // session says it should still be playing.
  function resyncFromStorage() {
    if (!audio) return;
    var savedPos = parseFloat(read(K_POS)) || 0;
    var wasPlaying = read(K_PLAYING) === 'true';
    var savedAt = parseInt(read(K_AT), 10) || 0;
    var target = savedPos;
    if (wasPlaying && savedAt) {
      target += Math.min((Date.now() - savedAt) / 1000, MAX_GAP);
    }
    if (isFinite(audio.duration) && audio.duration) {
      target = Math.min(target, Math.max(0, audio.duration - 0.5));
    }
    resumePos = target; // applied by the loadedmetadata handler if metadata is not ready yet
    try { audio.currentTime = target; } catch (e) {}
    if (wasPlaying) {
      play();
    } else {
      intent = false;
    }
    emit();
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
    intent = wasPlaying;

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
      '.ovi-music{position:fixed;left:14px;bottom:14px;z-index:900;display:flex;align-items:center;gap:9px;',
      'padding:6px 12px 6px 6px;background:var(--paper);color:var(--ink);border:2px solid var(--ink);',
      'box-shadow:3px 3px 0 var(--ink);font-family:\'Share Tech Mono\',monospace;',
      'cursor:grab;touch-action:none;user-select:none;}',
      '.ovi-music.dragging{cursor:grabbing;opacity:0.9;}',
      '.ovi-music.dragging *{cursor:grabbing;}',
      '.ovi-music-btn{display:flex;align-items:center;justify-content:center;width:30px;height:30px;flex:0 0 auto;',
      'padding:0;background:transparent;border:2px solid var(--ink);color:var(--ink);cursor:pointer;',
      'transition:background var(--speed),color var(--speed);}',
      '.ovi-music-btn:hover{background:var(--ink);color:var(--paper);}',
      '.ovi-music-btn svg{width:14px;height:14px;}',
      '.ovi-music-time{font-size:12px;letter-spacing:0.02em;white-space:nowrap;color:var(--ink);}'
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
      '<span class="ovi-music-time">0:00 / 0:00</span>';

    document.head.appendChild(style);
    document.body.appendChild(root);

    var btn = root.querySelector('.ovi-music-btn');
    var timeEl = root.querySelector('.ovi-music-time');
    var icPlay = root.querySelector('.ovi-ic-play');
    var icPause = root.querySelector('.ovi-ic-pause');

    var MARGIN = 14;

    function place(x, y) {
      var w = root.offsetWidth, h = root.offsetHeight;
      x = Math.max(MARGIN, Math.min(x, window.innerWidth - w - MARGIN));
      y = Math.max(MARGIN, Math.min(y, window.innerHeight - h - MARGIN));
      root.style.left = x + 'px';
      root.style.top = y + 'px';
      root.style.right = 'auto';
      root.style.bottom = 'auto';
    }

    function savePlace() {
      var r = root.getBoundingClientRect();
      write(K_X, String(Math.round(r.left)));
      write(K_Y, String(Math.round(r.top)));
    }

    var savedX = read(K_X), savedY = read(K_Y);
    if (savedX !== null && savedY !== null) place(parseFloat(savedX), parseFloat(savedY));

    // --- drag ---
    var dragging = false, moved = false, startX = 0, startY = 0, originL = 0, originT = 0;
    var DRAG_SLOP = 4; // px before a press counts as a drag rather than a click

    function onDown(ev) {
      if (ev.button !== undefined && ev.button !== 0) return;
      var r = root.getBoundingClientRect();
      dragging = true; moved = false;
      startX = ev.clientX; startY = ev.clientY;
      originL = r.left; originT = r.top;
      root.classList.add('dragging');
      // No setPointerCapture: it would retarget the following `click` to this root,
      // so the play/pause button would never fire. Document listeners track instead.
      document.addEventListener('pointermove', onMove, { passive: false });
      document.addEventListener('pointerup', onUp);
      document.addEventListener('pointercancel', onUp);
    }

    function onMove(ev) {
      if (!dragging) return;
      var dx = ev.clientX - startX, dy = ev.clientY - startY;
      if (!moved && Math.abs(dx) + Math.abs(dy) < DRAG_SLOP) return;
      moved = true;
      if (ev.cancelable) ev.preventDefault(); // stop text selection while dragging
      place(originL + dx, originT + dy);
    }

    function onUp() {
      if (!dragging) return;
      dragging = false;
      root.classList.remove('dragging');
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      if (moved) {
        savePlace();
        // Swallow the click that follows a drag so it doesn't toggle playback.
        root.addEventListener('click', swallow, true);
        setTimeout(function () { root.removeEventListener('click', swallow, true); }, 0);
      }
    }

    function swallow(ev) { ev.stopPropagation(); ev.preventDefault(); }

    // Grab anywhere on the pill; the button stays clickable because a non-moving
    // press still fires its click.
    root.addEventListener('pointerdown', onDown);
    btn.addEventListener('click', function () { toggle(); });

    // Keep the control on-screen when the window is resized.
    window.addEventListener('resize', function () {
      var r = root.getBoundingClientRect();
      place(r.left, r.top);
    });

    window.OviMusic.onChange(function (s) {
      btn.setAttribute('aria-pressed', s.playing ? 'true' : 'false');
      btn.setAttribute('aria-label', s.playing ? 'Pause' : 'Play');
      icPlay.style.display = s.playing ? 'none' : 'block';
      icPause.style.display = s.playing ? 'block' : 'none';
      timeEl.textContent = clock(s.currentTime) + ' / ' + clock(s.duration);
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
  // the song was first played. Re-check on pageshow, mount if now needed, and
  // re-adopt the shared playback state (the browser pauses media while frozen).
  window.addEventListener('pageshow', function (ev) {
    if (!ev.persisted) return;
    mountFloatingControl();
    resyncFromStorage();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
