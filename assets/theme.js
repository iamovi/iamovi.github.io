/**
 * theme.js — init_ovi theme engine
 * Reads `ovi-theme` from localStorage and applies it to <html> data-theme.
 */
(function () {
  const STORAGE_KEY = 'ovi-theme';

  function getTheme() {
    return localStorage.getItem(STORAGE_KEY) || 'manga';
  }

  // Ambient overlays: one wrapper per theme, each with its own particle class.
  var AMBIENT = {
    sakura: { id: 'sakura-petals', cls: 'sakura-petal', count: 10, sizeMin: 11, sizeVar: 7 },
    pixelnature: { id: 'pixel-leaves', cls: 'pixel-leaf', count: 12, sizeMin: 12, sizeVar: 8 }
  };

  function updateAmbient() {
    if (typeof document === 'undefined') return;
    function sync() {
      var currentTheme = getTheme();
      Object.keys(AMBIENT).forEach(function (theme) {
        var cfg = AMBIENT[theme];
        var existing = document.getElementById(cfg.id);
        if (currentTheme === theme) {
          if (!existing && document.body) {
            var wrap = document.createElement('div');
            wrap.id = cfg.id;
            wrap.setAttribute('aria-hidden', 'true');
            for (var i = 0; i < cfg.count; i++) {
              var p = document.createElement('div');
              p.className = cfg.cls;
              var left = (i * (96 / cfg.count) + Math.random() * 8) % 96;
              var delay = (Math.random() * 8).toFixed(1);
              var dur = (7 + Math.random() * 5).toFixed(1);
              var size = (cfg.sizeMin + Math.random() * cfg.sizeVar).toFixed(0);
              p.style.cssText = 'left:' + left + '%;--delay:' + delay + 's;--dur:' + dur + 's;width:' + size + 'px;height:' + size + 'px;';
              wrap.appendChild(p);
            }
            document.body.appendChild(wrap);
          }
        } else if (existing) {
          existing.remove();
        }
      });
    }
    if (document.body) {
      sync();
    } else {
      document.addEventListener('DOMContentLoaded', sync, { once: true });
    }
  }

  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    updateAmbient();
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
