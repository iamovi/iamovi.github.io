/**
 * cursor.js — init_ovi cursor effect engine
 * Reads `ovi-cursor` from localStorage and applies the chosen effect.
 * Effects: default | none | dot | crosshair | ink | samurai
 * Fully supports Manga theme (dark ink on paper) and Midnight theme (silver ink on dark).
 */
(function () {
  const STORAGE_KEY = 'ovi-cursor';

  function getEffect() {
    return localStorage.getItem(STORAGE_KEY) || 'default';
  }

  function isMidnight() {
    return document.documentElement.getAttribute('data-theme') === 'midnight';
  }

  function clearAll() {
    document.querySelectorAll('[data-cursor-el]').forEach(el => el.remove());
    document.body.style.cursor = '';
    document.body.classList.remove(
      'cursor-none', 'cursor-dot', 'cursor-crosshair', 'cursor-ink', 'cursor-samurai'
    );
    document.removeEventListener('mousemove', _inkHandler);
    document.removeEventListener('mousemove', _samuraiHandler);
    document.removeEventListener('mousemove', _dotHandler);
    document.removeEventListener('mousemove', _crosshairHandler);
  }

  // none
  function applyNone() {
    document.body.style.cursor = 'none';
    document.body.classList.add('cursor-none');
  }

  // dot
  let _dotEl = null;
  function _dotHandler(e) {
    if (!_dotEl) return;
    _dotEl.style.transform = 'translate(' + (e.clientX - 6) + 'px, ' + (e.clientY - 6) + 'px)';
  }
  function applyDot() {
    document.body.style.cursor = 'none';
    document.body.classList.add('cursor-dot');
    _dotEl = document.createElement('div');
    _dotEl.setAttribute('data-cursor-el', '');
    var midnight = isMidnight();
    var bg = midnight ? '#e8e8ed' : '#1a0f00';
    var blend = midnight ? 'normal' : 'multiply';
    var shadow = midnight ? '0 0 0 1px #121215, 0 0 8px rgba(232, 232, 237, 0.45)' : 'none';
    _dotEl.style.cssText = 'position:fixed;top:0;left:0;width:12px;height:12px;background:' + bg + ';border-radius:50%;pointer-events:none;z-index:99999;transition:transform 0.04s linear;mix-blend-mode:' + blend + ';box-shadow:' + shadow + ';';
    document.body.appendChild(_dotEl);
    document.addEventListener('mousemove', _dotHandler);
  }

  // crosshair
  let _crosshairEl = null;
  function _crosshairHandler(e) {
    if (!_crosshairEl) return;
    _crosshairEl.style.transform = 'translate(' + (e.clientX - 16) + 'px, ' + (e.clientY - 16) + 'px)';
  }
  function applyCrosshair() {
    document.body.style.cursor = 'none';
    document.body.classList.add('cursor-crosshair');
    _crosshairEl = document.createElement('div');
    _crosshairEl.setAttribute('data-cursor-el', '');
    var stroke = isMidnight() ? '#e8e8ed' : '#1a0f00';
    var filter = isMidnight() ? 'filter:drop-shadow(0 0 3px rgba(0,0,0,0.9));' : '';
    _crosshairEl.innerHTML = '<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><line x1="16" y1="2" x2="16" y2="12" stroke="' + stroke + '" stroke-width="2"/><line x1="16" y1="20" x2="16" y2="30" stroke="' + stroke + '" stroke-width="2"/><line x1="2" y1="16" x2="12" y2="16" stroke="' + stroke + '" stroke-width="2"/><line x1="20" y1="16" x2="30" y2="16" stroke="' + stroke + '" stroke-width="2"/><circle cx="16" cy="16" r="3" fill="none" stroke="' + stroke + '" stroke-width="1.5"/></svg>';
    _crosshairEl.style.cssText = 'position:fixed;top:0;left:0;pointer-events:none;z-index:99999;transition:transform 0.04s linear;' + filter;
    document.body.appendChild(_crosshairEl);
    document.addEventListener('mousemove', _crosshairHandler);
  }

  // ink trail
  let _inkThrottle = 0;
  function _inkHandler(e) {
    var now = Date.now();
    if (now - _inkThrottle < 40) return;
    _inkThrottle = now;
    var drop = document.createElement('div');
    drop.setAttribute('data-cursor-el', '');
    var size = 6 + Math.random() * 8;
    var angle = Math.random() * 360;
    var br = Math.random() > 0.5 ? '50%' : '20% 80% 70% 30% / 30% 60% 40% 70%';
    var midnight = isMidnight();
    var color = midnight ? '#e8e8ed' : '#1a0f00';
    var shadow = midnight ? 'box-shadow:0 0 4px rgba(232,232,237,0.35);' : '';
    drop.style.cssText = 'position:fixed;left:' + (e.clientX - size/2) + 'px;top:' + (e.clientY - size/2) + 'px;width:' + size + 'px;height:' + size + 'px;background:' + color + ';' + shadow + 'border-radius:' + br + ';pointer-events:none;z-index:99998;opacity:0.85;transform:rotate(' + angle + 'deg) scale(1);transition:opacity 0.6s ease,transform 0.6s ease;';
    document.body.appendChild(drop);
    requestAnimationFrame(function() {
      setTimeout(function() { drop.style.opacity='0'; drop.style.transform='rotate('+angle+'deg) scale(0.3)'; }, 20);
      setTimeout(function() { drop.remove(); }, 640);
    });
  }
  function applyInk() {
    document.body.classList.add('cursor-ink');
    document.addEventListener('mousemove', _inkHandler);
  }

  // samurai slash trail
  var _prevX = null, _prevY = null, _samuraiThrottle = 0;
  function _samuraiHandler(e) {
    var now = Date.now();
    if (now - _samuraiThrottle < 30) return;
    _samuraiThrottle = now;
    if (_prevX === null) { _prevX = e.clientX; _prevY = e.clientY; return; }
    var dx = e.clientX - _prevX, dy = e.clientY - _prevY;
    var len = Math.sqrt(dx*dx + dy*dy);
    if (len < 5) return;
    var angle = Math.atan2(dy, dx) * (180 / Math.PI);
    var slash = document.createElement('div');
    slash.setAttribute('data-cursor-el', '');
    var midnight = isMidnight();
    var grad = midnight
      ? 'linear-gradient(to right,transparent,#e8e8ed 30%,#ffffff 50%,#e8e8ed 70%,transparent)'
      : 'linear-gradient(to right,transparent,#1a0f00 30%,#1a0f00 70%,transparent)';
    var glow = midnight ? 'box-shadow:0 0 6px rgba(232,232,237,0.6);' : '';
    slash.style.cssText = 'position:fixed;left:' + _prevX + 'px;top:' + _prevY + 'px;width:' + Math.min(len,60) + 'px;height:2px;background:' + grad + ';' + glow + 'transform-origin:0 50%;transform:rotate('+angle+'deg);pointer-events:none;z-index:99998;opacity:0.9;transition:opacity 0.35s ease;';
    document.body.appendChild(slash);
    requestAnimationFrame(function() {
      setTimeout(function() { slash.style.opacity='0'; }, 20);
      setTimeout(function() { slash.remove(); }, 380);
    });
    _prevX = e.clientX; _prevY = e.clientY;
  }
  function applySamurai() {
    document.body.classList.add('cursor-samurai');
    _prevX = null; _prevY = null;
    document.addEventListener('mousemove', _samuraiHandler);
  }

  // generic click animation for all custom cursors
  function _clickHandler(e) {
    if (getEffect() === 'default') return; // no extra animation for default cursor
    var burst = document.createElement('div');
    burst.setAttribute('data-cursor-el', '');
    var midnight = isMidnight();
    var bColor = midnight ? '#e8e8ed' : '#1a0f00';
    var bShadow = midnight ? 'box-shadow:0 0 8px rgba(232,232,237,0.5);' : '';
    burst.style.cssText = 'position:fixed;left:' + (e.clientX - 12) + 'px;top:' + (e.clientY - 12) + 'px;width:24px;height:24px;border:2px solid ' + bColor + ';' + bShadow + 'border-radius:50%;pointer-events:none;z-index:99999;opacity:0.8;transform:scale(0.3);transition:transform 0.3s cubic-bezier(0.1, 0.8, 0.2, 1), opacity 0.3s ease;';
    document.body.appendChild(burst);
    requestAnimationFrame(function() {
      setTimeout(function() {
        burst.style.transform = 'scale(1.8)';
        burst.style.opacity = '0';
      }, 10);
      setTimeout(function() { burst.remove(); }, 350);
    });
  }

  // bind click globally once
  document.addEventListener('mousedown', _clickHandler);

  function apply(effect) {
    clearAll();
    switch (effect) {
      case 'none':      applyNone();      break;
      case 'dot':       applyDot();       break;
      case 'crosshair': applyCrosshair(); break;
      case 'ink':       applyInk();       break;
      case 'samurai':   applySamurai();   break;
      default: break;
    }
  }

  // Observe theme changes on <html> to update active cursor elements in real time
  if (typeof MutationObserver !== 'undefined') {
    var _themeObserver = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        if (mutations[i].attributeName === 'data-theme') {
          var cur = getEffect();
          if (cur === 'dot' || cur === 'crosshair') {
            apply(cur);
          }
          break;
        }
      }
    });
    _themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  window.OviCursor = {
    apply: function(effect) { localStorage.setItem(STORAGE_KEY, effect); apply(effect); },
    getEffect: getEffect,
    reload: function() { apply(getEffect()); }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { apply(getEffect()); });
  } else {
    apply(getEffect());
  }
})();
