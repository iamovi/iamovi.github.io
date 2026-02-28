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
      
      // Update progress bar - use transform for better performance
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
  
  // Optimized menu toggle with passive event listeners
  window.toggleMenu = function () {
    const menu = document.querySelector('.slide-menu');
    const overlay = document.querySelector('.menu-overlay');
    const body = document.body;
    const html = document.documentElement;
    
    const isOpening = !menu.classList.contains('open');
    
    // Use requestAnimationFrame for smoother animations
    requestAnimationFrame(() => {
      menu.classList.toggle('open');
      overlay.classList.toggle('show');
      
      // Prevent body scroll when menu is open
      if (isOpening) {
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
    });
  };
  
  window.showSection = function (sectionName) {
    // Use requestAnimationFrame for smooth section switching
    requestAnimationFrame(() => {
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
    });
  };

  // Avatar Lightbox Functions - Optimized
  window.openAvatarLightbox = function() {
    const lightbox = document.getElementById('avatarLightbox');
    const body = document.body;
    const html = document.documentElement;
    
    requestAnimationFrame(() => {
      lightbox.classList.add('show');
      
      // Prevent body scroll
      const scrollY = window.scrollY;
      body.style.position = 'fixed';
      body.style.top = `-${scrollY}px`;
      body.style.width = '100%';
      body.style.overflow = 'hidden';
      html.style.overflow = 'hidden';
    });
  };

  window.closeAvatarLightbox = function() {
    const lightbox = document.getElementById('avatarLightbox');
    const body = document.body;
    const html = document.documentElement;
    
    requestAnimationFrame(() => {
      lightbox.classList.remove('show');
      
      // Restore scroll position
      const scrollY = body.style.top;
      body.style.position = '';
      body.style.top = '';
      body.style.width = '';
      body.style.overflow = '';
      html.style.overflow = '';
      window.scrollTo(0, parseInt(scrollY || '0') * -1);
    });
  };
  
  // LOADER
  const loader = document.getElementById('site-loader');
  const loaderBar = document.getElementById('loader-bar');
  const loaderStatus = document.getElementById('loader-status');
  const loaderGlitch = document.getElementById('loader-glitch');

  if (loaderGlitch) loaderGlitch.setAttribute('data-text', loaderGlitch.textContent);

  let progress = 0;
  const statuses = ['loading...', 'fetching assets...', 'rendering...', 'almost there...'];
  let statusIdx = 0;

  const progressInterval = setInterval(() => {
    progress = Math.min(progress + Math.random() * 18, 85);
    if (loaderBar) loaderBar.style.width = progress + '%';
    if (loaderStatus && statusIdx < statuses.length - 1) {
      statusIdx = Math.floor(progress / 30);
      loaderStatus.textContent = statuses[Math.min(statusIdx, statuses.length - 1)];
    }
  }, 200);

  function finishLoader() {
    clearInterval(progressInterval);
    if (loaderBar) loaderBar.style.width = '100%';
    if (loaderStatus) loaderStatus.textContent = 'done.';
    setTimeout(() => {
      if (loader) loader.classList.add('hide');
      setTimeout(() => { if (loader) loader.remove(); }, 500);
    }, 400);
  }

  if (document.readyState === 'complete') {
    finishLoader();
  } else {
    window.addEventListener('load', finishLoader);
  }

  // JOKE — lazy load when section is visible
  let jokeLoaded = false;

  window.fetchJoke = function() {
    const skeleton = document.getElementById('waifu-skeleton');
    const content = document.getElementById('joke-content');
    const setup = document.getElementById('joke-setup');
    const delivery = document.getElementById('joke-delivery');
    if (!skeleton || !content) return;

    skeleton.classList.remove('hide');
    content.style.display = 'none';

    fetch('https://v2.jokeapi.dev/joke/Any?safe-mode')
      .then(r => r.json())
      .then(data => {
        skeleton.classList.add('hide');
        content.style.display = 'block';
        if (data.type === 'single') {
          setup.textContent = data.joke;
          delivery.textContent = '';
          delivery.style.display = 'none';
        } else {
          setup.textContent = data.setup;
          delivery.textContent = data.delivery;
          delivery.style.display = 'block';
        }
      })
      .catch(() => {
        skeleton.classList.add('hide');
        content.style.display = 'block';
        setup.textContent = 'failed to load joke. try again.';
        delivery.textContent = '';
      });
  };

  const waifuObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !jokeLoaded) {
        jokeLoaded = true;
        fetchJoke();
        waifuObserver.disconnect();
      }
    });
  }, { threshold: 0.2 });

  const waifuSection = document.getElementById('waifu-section');
  if (waifuSection) waifuObserver.observe(waifuSection);

  // PROJECTS — loaded from projects.json
  const PER_PAGE = 3;
  let currentPage = 1;
  let totalPages = 1;
  let projects = [];

  function renderProjects(direction = 0) {
    const list = document.getElementById('projects-list');
    if (!list) return;

    const outX = direction > 0 ? '-60px' : '60px';
    const inX = direction > 0 ? '60px' : '-60px';

    list.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
    list.style.opacity = '0';
    list.style.transform = `translateX(${outX})`;

    setTimeout(() => {
      const start = (currentPage - 1) * PER_PAGE;
      const slice = projects.slice(start, start + PER_PAGE);

      list.innerHTML = slice.map(p => `
        <li>
          <h2><a href="${p.url}" target="_blank">${p.name}</a></h2>
          <p>${p.description}</p>
          <div class="date">${p.date}</div>
        </li>
      `).join('');

      document.getElementById('page-indicator').textContent = currentPage + ' / ' + totalPages;
      document.getElementById('prev-btn').disabled = currentPage === 1;
      document.getElementById('next-btn').disabled = currentPage === totalPages;

      list.style.transition = 'none';
      list.style.opacity = '0';
      list.style.transform = `translateX(${inX})`;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          list.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
          list.style.opacity = '1';
          list.style.transform = 'translateX(0)';
        });
      });
    }, 200);
  }

  window.changePage = function(dir) {
    currentPage = Math.min(Math.max(currentPage + dir, 1), totalPages);
    renderProjects(dir);
  };

  fetch('./projects.json')
    .then(r => r.json())
    .then(data => {
      projects = data.reverse(); // newest last in JSON = first on page
      totalPages = Math.ceil(projects.length / PER_PAGE);
      renderProjects();
    })
    .catch(err => console.error('Failed to load projects.json', err));

  // Passive event listeners for better scroll performance
  document.addEventListener('touchstart', function() {}, { passive: true });
  document.addEventListener('touchmove', function() {}, { passive: true });

  window.openSsLightbox = function(src) {
    const lightbox = document.getElementById('ssLightbox');
    const img = lightbox.querySelector('.ss-lightbox-image');
    const body = document.body;
    const html = document.documentElement;
    img.src = src;
    const scrollY = window.scrollY;
    requestAnimationFrame(() => {
      lightbox.classList.add('show');
      body.style.position = 'fixed';
      body.style.top = `-${scrollY}px`;
      body.style.width = '100%';
      body.style.overflow = 'hidden';
      html.style.overflow = 'hidden';
    });
  };

  window.closeSsLightbox = function() {
    const lightbox = document.getElementById('ssLightbox');
    const body = document.body;
    const html = document.documentElement;
    const scrollY = parseInt(body.style.top || '0') * -1;
    requestAnimationFrame(() => {
      lightbox.classList.remove('show');
      body.style.position = '';
      body.style.top = '';
      body.style.width = '';
      body.style.overflow = '';
      html.style.overflow = '';
      window.scrollTo(0, scrollY);
    });
  };
})();