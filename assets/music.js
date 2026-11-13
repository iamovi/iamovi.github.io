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
 * instead of getting a floating control. The floating control can be dragged
 * anywhere; minimizing shrinks it to a compact widget that docks to the nearest
 * screen corner. Position and minimized state are remembered for the session.
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
  var K_MIN = 'ovi_music_min';
  var K_X = 'ovi_music_x';
  var K_Y = 'ovi_music_y';
  var K_CORNER = 'ovi_music_corner';

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
      'box-sizing:border-box;width:min(300px,calc(100vw - 28px));',
      'padding:9px 10px;background:var(--paper);color:var(--ink);border:2px solid var(--ink);',
      'box-shadow:3px 3px 0 var(--ink);font-family:\'Share Tech Mono\',monospace;',
      'touch-action:none;user-select:none;}',
      '.ovi-music.dragging{opacity:0.9;cursor:grabbing;}',
      '.ovi-music.dragging *{cursor:grabbing;}',
      '.ovi-music-btn{display:flex;align-items:center;justify-content:center;width:34px;height:34px;flex:0 0 auto;',
      'padding:0;background:transparent;border:2px solid var(--ink);color:var(--ink);cursor:pointer;',
      'transition:background var(--speed),color var(--speed);}',
      '.ovi-music-btn:hover{background:var(--ink);color:var(--paper);}',
      '.ovi-music-btn svg{width:15px;height:15px;}',
      '.ovi-music-meta{min-width:0;flex:1 1 auto;display:flex;flex-direction:column;gap:7px;}',
      '.ovi-music-title{display:block;font-size:11px;letter-spacing:0.02em;color:var(--ink);',
      'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.ovi-music-track{position:relative;height:7px;background:var(--paper-dark);border:1px solid var(--ink);',
      'cursor:pointer;}',
      '.ovi-music-fill{height:100%;width:0%;background:var(--ink);transition:width 0.1s linear;}',
      '.ovi-music-knob{position:absolute;top:50%;left:0;width:10px;height:10px;margin-left:-5px;background:var(--ink);',
      'border:1px solid var(--paper);transform:translateY(-50%);pointer-events:none;}',
      '.ovi-music-min,.ovi-music-expand{display:flex;align-items:center;justify-content:center;width:20px;height:20px;',
      'flex:0 0 auto;padding:0;background:transparent;border:1px solid var(--ink);color:var(--ink);cursor:pointer;line-height:1;}',
      '.ovi-music-min:hover,.ovi-music-expand:hover{background:var(--ink);color:var(--paper);}',
      '.ovi-music-min svg,.ovi-music-expand svg{width:11px;height:11px;}',
      '.ovi-music-expand{display:none;}',
      // Minimized: a compact widget docked to a screen corner. The title, seek bar
      // and minimize button hide; a restore button takes the minimize button's place.
      '.ovi-music.min{padding:6px;gap:6px;width:auto;}',
      '.ovi-music.min .ovi-music-meta,.ovi-music.min .ovi-music-min{display:none;}',
      '.ovi-music.min .ovi-music-expand{display:flex;}',
      '.ovi-music.min .ovi-music-btn{width:30px;height:30px;}',
      '@media (max-width:600px){.ovi-music-title{display:none;}}',
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
        '<div class="ovi-music-track" role="slider" tabindex="0" aria-label="Seek" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">' +
          '<div class="ovi-music-fill"></div>' +
          '<div class="ovi-music-knob"></div>' +
        '</div>' +
      '</div>' +
      '<button class="ovi-music-min" type="button" aria-label="Minimize player" title="Minimize to corner">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14v2H5z" fill="currentColor"/></svg>' +
      '</button>' +
      '<button class="ovi-music-expand" type="button" aria-label="Expand player" title="Expand">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v2H6v4H4V4zm10 0h6v6h-2V6h-4V4zM4 14h2v4h4v2H4v-6zm14 0h2v6h-6v-2h4v-4z" fill="currentColor"/></svg>' +
      '</button>';

    var title = root.querySelector('.ovi-music-title');
    title.textContent = TITLE;

    document.head.appendChild(style);
    document.body.appendChild(root);

    var btn = root.querySelector('.ovi-music-btn');
    var track = root.querySelector('.ovi-music-track');
    var fill = root.querySelector('.ovi-music-fill');
    var knob = root.querySelector('.ovi-music-knob');
    var icPlay = root.querySelector('.ovi-ic-play');
    var icPause = root.querySelector('.ovi-ic-pause');
    var minBtn = root.querySelector('.ovi-music-min');
    var expandBtn = root.querySelector('.ovi-music-expand');

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

    // The screen corner a coordinate is nearest, as 'tl'/'tr'/'bl'/'br'.
    function cornerOf(x, y) {
      var w = root.offsetWidth, h = root.offsetHeight;
      return (x + w / 2 < window.innerWidth / 2 ? 'l' : 'r') === 'l'
        ? (y + h / 2 < window.innerHeight / 2 ? 'tl' : 'bl')
        : (y + h / 2 < window.innerHeight / 2 ? 'tr' : 'br');
    }

    function cornerPos(c) {
      var w = root.offsetWidth, h = root.offsetHeight;
      var x = (c === 'tl' || c === 'bl') ? MARGIN : window.innerWidth - w - MARGIN;
      var y = (c === 'tl' || c === 'tr') ? MARGIN : window.innerHeight - h - MARGIN;
      return [x, y];
    }

    function currentCorner() {
      var r = root.getBoundingClientRect();
      return cornerOf(r.left, r.top);
    }

    function savePlace() {
      var r = root.getBoundingClientRect();
      write(K_X, String(Math.round(r.left)));
      write(K_Y, String(Math.round(r.top)));
      write(K_CORNER, currentCorner());
    }

    function setMin(on) {
      root.classList.toggle('min', on);
      write(K_MIN, on ? 'true' : 'false');
      minBtn.setAttribute('aria-label', 'Minimize player');
      // Snap into a corner after the size change so the widget always sits flush.
      requestAnimationFrame(function () {
        var c = read(K_CORNER) || currentCorner();
        var p = cornerPos(c);
        place(p[0], p[1]);
        savePlace();
      });
    }

    // Restore the last position, or the saved corner when minimized.
    (function restorePlace() {
      var minimized = read(K_MIN) === 'true';
      var savedX = read(K_X), savedY = read(K_Y);
      if (savedX !== null && savedY !== null) {
        place(parseFloat(savedX), parseFloat(savedY));
      } else {
        var c = read(K_CORNER);
        if (c) { var p = cornerPos(c); place(p[0], p[1]); }
      }
      if (minimized) setMin(true);
    })();

    // --- drag ---
    var dragging = false, moved = false, startX = 0, startY = 0, originL = 0, originT = 0;
    var DRAG_SLOP = 4; // px before a press counts as a drag rather than a click

    function onDown(ev) {
      if (ev.button !== undefined && ev.button !== 0) return;
      if (ev.target.closest && ev.target.closest('.ovi-music-track')) return; // seek, not drag
      var r = root.getBoundingClientRect();
      dragging = true; moved = false;
      startX = ev.clientX; startY = ev.clientY;
      originL = r.left; originT = r.top;
      root.classList.add('dragging');
      // No setPointerCapture: it would retarget the following `click` to this
      // root, so the play/pause and minimize buttons would never fire. Document
      // listeners below track the drag instead.
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
        // A minimized widget always docks to the nearest corner; the expanded
        // one keeps exactly where it was dropped.
        if (root.classList.contains('min')) {
          var p = cornerPos(currentCorner());
          place(p[0], p[1]);
        }
        savePlace();
        // Swallow the click that follows a drag so it doesn't toggle playback.
        root.addEventListener('click', swallow, true);
        setTimeout(function () { root.removeEventListener('click', swallow, true); }, 0);
      }
    }

    function swallow(ev) { ev.stopPropagation(); ev.preventDefault(); }

    // Grab anywhere on the control except the seek bar; buttons stay clickable
    // because a non-moving press still fires their click.
    root.addEventListener('pointerdown', onDown);

    btn.addEventListener('click', function () { toggle(); });
    expandBtn.addEventListener('click', function (e) { e.stopPropagation(); setMin(false); });
    minBtn.addEventListener('click', function (e) { e.stopPropagation(); setMin(true); });
    track.addEventListener('click', function (e) {
      var rect = track.getBoundingClientRect();
      if (rect.width) seek((e.clientX - rect.left) / rect.width);
    });
    // Keyboard seek on the focused bar.
    track.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 0.05 : e.key === 'ArrowLeft' ? -0.05 : 0;
      if (!d || !audio || !audio.duration) return;
      e.preventDefault();
      seek((audio.currentTime / audio.duration) + d);
    });

    // Keep the control on-screen on resize; a minimized widget re-docks to its corner.
    window.addEventListener('resize', function () {
      if (root.classList.contains('min')) {
        var p = cornerPos(read(K_CORNER) || currentCorner());
        place(p[0], p[1]);
      } else {
        var r = root.getBoundingClientRect();
        place(r.left, r.top);
      }
      savePlace();
    });

    window.OviMusic.onChange(function (s) {
      btn.setAttribute('aria-pressed', s.playing ? 'true' : 'false');
      btn.setAttribute('aria-label', s.playing ? 'Pause' : 'Play');
      icPlay.style.display = s.playing ? 'none' : 'block';
      icPause.style.display = s.playing ? 'block' : 'none';
      var pct = s.duration ? (s.currentTime / s.duration) * 100 : 0;
      fill.style.width = pct + '%';
      knob.style.left = pct + '%';
      track.setAttribute('aria-valuenow', s.duration ? Math.round(pct) : 0);
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
