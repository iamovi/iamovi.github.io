/**
 * theme.js — init_ovi theme engine
 * Reads `ovi-theme` from localStorage and applies it to <html> data-theme.
 */
(function () {
  const STORAGE_KEY = 'ovi-theme';

  function getTheme() {
    return localStorage.getItem(STORAGE_KEY) || 'manga';
  }

  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
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
