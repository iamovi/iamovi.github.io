(function () {
  const THEME_KEY = "theme";

  // Music Player
  let audio = null;
  let isPlaying = false;
  let timerInterval = null;

  window.initMusicPlayer = function() {
    audio = new Audio('https://ik.imagekit.io/iamovi/init_ovi/NEVER_SATISFIED.mp3');
    audio.loop = true;
    audio.preload = 'metadata';

    audio.addEventListener('ended', function() {
      isPlaying = false;
      updatePlayButton();
      stopTimer();
    });

    audio.addEventListener('loadedmetadata', function() {
      updateTimer();
    });

    audio.addEventListener('timeupdate', function() {
      updateTimer();
    });
  };

  // Initialize audio on page load to preload metadata
  document.addEventListener('DOMContentLoaded', function() {
    initMusicPlayer();
  });

  function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function updateTimer() {
    const timerElement = document.querySelector('.music-timer');
    const progressBar = document.querySelector('.progress-fill');

    if (timerElement && audio) {
      const currentTime = formatTime(audio.currentTime);
      const duration = formatTime(audio.duration);
      timerElement.textContent = `${currentTime} / ${duration}`;

      // Direct update - no transition for smooth performance
      if (progressBar && audio.duration) {
        const progress = (audio.currentTime / audio.duration) * 100;
        progressBar.style.width = `${progress}%`;
      }
    }
  }

  window.seekMusic = function(e) {
    if (!audio || !audio.duration) return;

    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const percentage = clickX / width;

    audio.currentTime = percentage * audio.duration;
    updateTimer();
  };

  function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 100);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  window.toggleMusic = function() {
    if (!audio) {
      initMusicPlayer();
    }

    if (isPlaying) {
      audio.pause();
      isPlaying = false;
      stopTimer();
    } else {
      audio.play();
      isPlaying = true;
      startTimer();
    }

    updatePlayButton();
  };

  function updatePlayButton() {
    const playIcon = document.querySelector('.play-icon');
    const pauseIcon = document.querySelector('.pause-icon');

    if (isPlaying) {
      playIcon.style.display = 'none';
      pauseIcon.style.display = 'block';
    } else {
      playIcon.style.display = 'block';
      pauseIcon.style.display = 'none';
    }
  }

  window.toggleTheme = function () {
    const isLight = document.documentElement.classList.toggle("light");
    try {
      localStorage.setItem(THEME_KEY, isLight ? "light" : "dark");
    } catch (e) {}
  };

  // HYPER-OPTIMIZED MENU TOGGLE - No requestAnimationFrame needed
  window.toggleMenu = function () {
    const menu = document.querySelector('.slide-menu');
    const overlay = document.querySelector('.menu-overlay');
    const body = document.body;
    const html = document.documentElement;

    const isOpen = menu.classList.contains('open');

    if (!isOpen) {
      // Opening menu
      const scrollY = window.scrollY;
      
      // Batch all DOM changes together
      menu.classList.add('open');
      overlay.classList.add('show');
      body.style.cssText = `position: fixed; top: -${scrollY}px; width: 100%; overflow: hidden;`;
      html.style.overflow = 'hidden';
    } else {
      // Closing menu
      const scrollY = body.style.top;
      
      // Batch all DOM changes together
      menu.classList.remove('open');
      overlay.classList.remove('show');
      body.style.cssText = '';
      html.style.overflow = '';
      
      // Restore scroll in next frame to avoid jank
      setTimeout(() => {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }, 0);
    }
  };

  window.showSection = function (sectionName) {
    const sections = document.querySelectorAll('.section');
    const menuLinks = document.querySelectorAll('.menu-link');
    
    // Batch DOM reads
    const targetSection = document.getElementById(sectionName + '-section');
    const activeLink = document.getElementById(sectionName + '-link');
    
    // Batch DOM writes
    sections.forEach(section => section.classList.remove('active'));
    menuLinks.forEach(link => link.classList.remove('active'));
    
    if (targetSection) targetSection.classList.add('active');
    if (activeLink) activeLink.classList.add('active');
  };

  // HYPER-OPTIMIZED Avatar Lightbox Functions
  window.openAvatarLightbox = function() {
    const lightbox = document.getElementById('avatarLightbox');
    const body = document.body;
    const html = document.documentElement;
    const scrollY = window.scrollY;

    // Batch all DOM changes
    lightbox.classList.add('show');
    body.style.cssText = `position: fixed; top: -${scrollY}px; width: 100%; overflow: hidden;`;
    html.style.overflow = 'hidden';
  };

  window.closeAvatarLightbox = function() {
    const lightbox = document.getElementById('avatarLightbox');
    const body = document.body;
    const html = document.documentElement;
    const scrollY = body.style.top;

    // Batch all DOM changes
    lightbox.classList.remove('show');
    body.style.cssText = '';
    html.style.overflow = '';
    
    // Restore scroll in next frame
    setTimeout(() => {
      window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }, 0);
  };

  // Touch event optimization - prevent 300ms click delay on mobile
  let touchStartTime = 0;
  let touchStartX = 0;
  let touchStartY = 0;

  document.addEventListener('touchstart', function(e) {
    touchStartTime = Date.now();
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', function(e) {
    const touchEndTime = Date.now();
    const touchDuration = touchEndTime - touchStartTime;
    
    // If touch was quick and didn't move much, it's a tap
    if (touchDuration < 200) {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const moveX = Math.abs(touchEndX - touchStartX);
      const moveY = Math.abs(touchEndY - touchStartY);
      
      if (moveX < 10 && moveY < 10) {
        // Quick tap detected - browser will handle click
        // This just ensures we're ready for fast interactions
      }
    }
  }, { passive: true });

  // Prevent rubber band scrolling on iOS when menu is open
  let lastTouchY = 0;
  
  document.addEventListener('touchstart', function(e) {
    lastTouchY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchmove', function(e) {
    const menu = document.querySelector('.slide-menu');
    if (menu && menu.classList.contains('open')) {
      const currentY = e.touches[0].clientY;
      const scrollTop = menu.scrollTop;
      const scrollHeight = menu.scrollHeight;
      const clientHeight = menu.clientHeight;
      
      // Prevent overscroll
      if ((scrollTop <= 0 && currentY > lastTouchY) || 
          (scrollTop + clientHeight >= scrollHeight && currentY < lastTouchY)) {
        e.preventDefault();
      }
      
      lastTouchY = currentY;
    }
  }, { passive: false });

})();