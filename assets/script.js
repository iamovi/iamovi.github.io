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
      
      // Update progress bar
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
  
  window.toggleMenu = function () {
    const menu = document.querySelector('.slide-menu');
    const overlay = document.querySelector('.menu-overlay');
    const body = document.body;
    const html = document.documentElement;
    
    menu.classList.toggle('open');
    overlay.classList.toggle('show');
    
    // Prevent body scroll when menu is open
    if (menu.classList.contains('open')) {
      // Store current scroll position
      const scrollY = window.scrollY;
      body.style.position = 'fixed';
      body.style.top = `-${scrollY}px`;
      body.style.width = '100%';
      body.style.overflow = 'hidden';
      html.style.overflow = 'hidden';
    } else {
      // Restore scroll position
      const scrollY = body.style.top;
      body.style.position = '';
      body.style.top = '';
      body.style.width = '';
      body.style.overflow = '';
      html.style.overflow = '';
      window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }
  };
  
  window.showSection = function (sectionName) {
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
      section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(sectionName + '-section');
    if (targetSection) {
      targetSection.classList.add('active');
    }
    
    // Update menu active state
    const menuLinks = document.querySelectorAll('.menu-link');
    menuLinks.forEach(link => {
      link.classList.remove('active');
    });
    
    const activeLink = document.getElementById(sectionName + '-link');
    if (activeLink) {
      activeLink.classList.add('active');
    }
  };
})();