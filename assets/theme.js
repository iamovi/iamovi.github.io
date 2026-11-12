/**
 * theme.js — init_ovi theme engine
 * Reads `ovi-theme` from localStorage and applies it to <html> data-theme.
 */
(function () {
  const STORAGE_KEY = 'ovi-theme';

  function getTheme() {
    return localStorage.getItem(STORAGE_KEY) || 'manga';
  }

  function updateSakuraPetals() {
    if (typeof document === 'undefined') return;
    function sync() {
      var currentTheme = getTheme();
      var existing = document.getElementById('sakura-petals');
      if (currentTheme === 'sakura') {
        if (!existing && document.body) {
          var wrap = document.createElement('div');
          wrap.id = 'sakura-petals';
          wrap.setAttribute('aria-hidden', 'true');
          var count = 10;
          for (var i = 0; i < count; i++) {
            var p = document.createElement('div');
            p.className = 'sakura-petal';
            var left = (i * 10 + Math.random() * 8) % 96;
            var delay = (Math.random() * 8).toFixed(1);
            var dur = (7 + Math.random() * 5).toFixed(1);
            var size = (11 + Math.random() * 7).toFixed(0);
            p.style.cssText = 'left:' + left + '%;--delay:' + delay + 's;--dur:' + dur + 's;width:' + size + 'px;height:' + size + 'px;';
            wrap.appendChild(p);
          }
          document.body.appendChild(wrap);
        }
      } else {
        if (existing) existing.remove();
      }
    }
    if (document.body) {
      sync();
    } else {
      document.addEventListener('DOMContentLoaded', sync, { once: true });
    }
  }

  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    updateSakuraPetals();
  }

  window.OviTheme = {
    apply: function(theme) { 
      localStorage.setItem(STORAGE_KEY, theme); 
      apply(theme); 
    },
    getTheme: getTheme,
    reload: function() { apply(getTheme()); }
  };

  // Run immediately (synchronously in <head>) to prevent FOUC
  apply(getTheme());
})();
