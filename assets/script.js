(function () {
  // Music Player
  let audio = null;
  let isPlaying = false;
  let timerInterval = null;

  window.initMusicPlayer = function () {
    audio = new Audio('https://ik.imagekit.io/iamovi/init_ovi/NEVER_SATISFIED.mp3');
    audio.loop = true;
    audio.preload = 'metadata';

    audio.addEventListener('ended', function () {
      isPlaying = false;
      updatePlayButton();
      stopTimer();
    });

    audio.addEventListener('loadedmetadata', function () {
      updateTimer();
    });

    audio.addEventListener('timeupdate', function () {
      updateTimer();
    });
  };

  // Initialize audio on page load to preload metadata
  document.addEventListener('DOMContentLoaded', function () {
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

  window.seekMusic = function (e) {
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

  window.toggleMusic = function () {
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
  window.openAvatarLightbox = function () {
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

  window.closeAvatarLightbox = function () {
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

  // SKELETON — dynamically built to match active section
  const skeletonEl = document.getElementById('site-skeleton');

  function buildSkeleton() {
    if (!skeletonEl) return;

    // detect active section from menu link
    const activeLink = document.querySelector('.menu-link.active');
    const section = activeLink ? (activeLink.id || '').replace('-link', '') : 'projects';

    // always build header first
    let html = `
      <div class="skeleton-container">
        <div class="skeleton-header">
          <div class="skeleton-avatar"></div>
          <div class="skeleton-header-info">
            <div class="skeleton-block" style="width:55%;height:32px;"></div>
            <div class="skeleton-block" style="width:80%;height:14px;margin-top:10px;"></div>
            <div class="skeleton-nav">
              <div class="skeleton-block" style="width:55px;height:12px;"></div>
              <div class="skeleton-block" style="width:55px;height:12px;"></div>
              <div class="skeleton-block" style="width:75px;height:12px;"></div>
            </div>
          </div>
        </div>`;

    if (section === 'projects') {
      // search bar
      html += `
        <div class="skeleton-search">
          <div class="skeleton-block" style="width:14px;height:20px;"></div>
          <div class="skeleton-block" style="flex:1;height:14px;"></div>
        </div>`;
      // project rows — match PER_PAGE (3)
      const widths = [[65, 100, 75], [50, 100, 60], [70, 100, 85]];
      widths.forEach(([w1, w2, w3]) => {
        html += `
        <div class="skeleton-item">
          <div class="skeleton-block" style="width:${w1}%;height:22px;"></div>
          <div class="skeleton-block" style="width:${w2}%;height:13px;margin-top:10px;"></div>
          <div class="skeleton-block" style="width:${w3}%;height:13px;margin-top:6px;"></div>
          <div class="skeleton-block" style="width:70px;height:11px;margin-top:8px;"></div>
        </div>`;
      });

    } else if (section === 'about') {
      // about text lines
      [90, 100, 80, 100, 95].forEach(w => {
        html += `<div class="skeleton-block" style="width:${w}%;height:14px;margin-bottom:10px;"></div>`;
      });
      // image placeholder
      html += `<div class="skeleton-block" style="width:50%;height:140px;margin:24px 0;"></div>`;
      // heading
      html += `<div class="skeleton-block" style="width:35%;height:20px;margin-bottom:14px;"></div>`;
      [100, 95, 85, 100].forEach(w => {
        html += `<div class="skeleton-block" style="width:${w}%;height:14px;margin-bottom:10px;"></div>`;
      });
      // skill tags
      html += `<div class="skeleton-nav" style="margin-top:16px;flex-wrap:wrap;gap:10px;">`;
      [80, 70, 100, 85, 90].forEach(w => {
        html += `<div class="skeleton-block" style="width:${w}px;height:28px;"></div>`;
      });
      html += `</div>`;

    } else if (section === 'claude') {
      // claude said blocks
      [1, 2, 3, 4].forEach(() => {
        html += `
        <div class="skeleton-item" style="border-left:4px solid #ccc;padding-left:16px;border-bottom:none;margin-bottom:28px;">
          <div class="skeleton-block" style="width:30%;height:11px;margin-bottom:10px;"></div>
          <div class="skeleton-block" style="width:100%;height:14px;margin-bottom:6px;"></div>
          <div class="skeleton-block" style="width:90%;height:14px;margin-bottom:6px;"></div>
          <div class="skeleton-block" style="width:75%;height:14px;"></div>
        </div>`;
      });

    } else if (section === 'blog') {
      [1, 2, 3].forEach(() => {
        html += `
        <div class="skeleton-item" style="margin-bottom:28px;">
          <div class="skeleton-block" style="width:20%;height:10px;margin-bottom:10px;"></div>
          <div class="skeleton-block" style="width:65%;height:20px;margin-bottom:8px;"></div>
          <div class="skeleton-block" style="width:100%;height:13px;margin-bottom:6px;"></div>
          <div class="skeleton-block" style="width:85%;height:13px;"></div>
        </div>`;
      });
    }

    html += `</div>`;
    skeletonEl.innerHTML = html;
  }

  function hideSkeleton() {
    if (!skeletonEl) return;
    // 0.5s delay before fade out
    setTimeout(() => {
      skeletonEl.classList.add('skeleton-hide');
      setTimeout(() => skeletonEl.remove(), 300);
    }, 500);
  }

  // build immediately, hide when fully loaded
  buildSkeleton();

  if (document.readyState === 'complete') {
    hideSkeleton();
  } else {
    window.addEventListener('load', hideSkeleton);
  }

  // rebuild skeleton if section changes before load completes
  const _origShowSection = window.showSection;
  window.showSection = function(sectionName) {
    _origShowSection(sectionName);
    if (skeletonEl && skeletonEl.parentNode) buildSkeleton();
  };

  // JOKE — lazy load when section is visible
  let jokeLoaded = false;

  window.fetchJoke = function () {
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

  // PROJECTS variables — declared early so search can use them
  const PER_PAGE = 3;
  let currentPage = 1;
  let totalPages = 1;
  let projects = [];
  let searchQuery = '';

  // SEARCH
  window.filterProjects = function (query) {
    searchQuery = query.toLowerCase().trim();
    currentPage = 1;
    renderProjects(0);
  };

  function getFilteredProjects() {
    if (!searchQuery) return projects;
    return projects.filter(p =>
      p.name.toLowerCase().includes(searchQuery) ||
      p.description.toLowerCase().includes(searchQuery)
    );
  }

  // PROJECTS — loaded from projects.json
  function renderProjects(direction = 0) {
    const list = document.getElementById('projects-list');
    if (!list) return;

    const filtered = getFilteredProjects();
    totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
    if (currentPage > totalPages) currentPage = totalPages;

    list.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
    list.style.opacity = '0';
    list.style.transform = `translateX(${direction > 0 ? '-60px' : direction < 0 ? '60px' : '0'})`;

    setTimeout(() => {
      const start = (currentPage - 1) * PER_PAGE;
      const slice = filtered.slice(start, start + PER_PAGE);

      if (slice.length === 0) {
        list.innerHTML = `<p class="no-results">[ no projects found ]</p>`;
      } else {
        list.innerHTML = slice.map(p => `
          <li>
            <h2><a href="${p.url}" target="_blank">${p.name}</a></h2>
            <p>${p.description}</p>
            <div class="date">${p.date}</div>
          </li>
        `).join('');
      }

      document.getElementById('page-indicator').textContent = currentPage + ' / ' + totalPages;
      document.getElementById('prev-btn').disabled = currentPage === 1;
      document.getElementById('next-btn').disabled = currentPage === totalPages;

      list.style.transition = 'none';
      list.style.opacity = '0';
      list.style.transform = `translateX(${direction > 0 ? '60px' : direction < 0 ? '-60px' : '0'})`;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          list.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
          list.style.opacity = '1';
          list.style.transform = 'translateX(0)';
        });
      });
    }, 200);
  }

  window.changePage = function (dir) {
    currentPage = Math.min(Math.max(currentPage + dir, 1), totalPages);
    renderProjects(dir);
  };

  fetch('./projects.json')
    .then(r => r.json())
    .then(data => {
      projects = data.reverse();
      totalPages = Math.ceil(projects.length / PER_PAGE);
      renderProjects(0);
    })
    .catch(err => console.error('Failed to load projects.json', err));

  // BLOG — loaded from blog.json
  let blogPosts = [];

  function renderBlog() {
    const list = document.getElementById('blog-list');
    const empty = document.getElementById('blog-empty');
    const count = document.getElementById('blog-count');
    if (!list) return;

    if (blogPosts.length === 0) {
      list.style.display = 'none';
      if (empty) empty.style.display = 'block';
      if (count) count.textContent = '';
      return;
    }

    if (empty) empty.style.display = 'none';
    list.style.display = '';
    if (count) count.textContent = blogPosts.length + ' post' + (blogPosts.length !== 1 ? 's' : '');

    list.innerHTML = blogPosts.map(post => `
      <li class="blog-post-item">
        <div class="blog-post-meta">
          <span class="blog-post-date">${post.date}</span>
          ${post.tag ? `<span class="blog-post-tag">${post.tag}</span>` : ''}
        </div>
        <h2 class="blog-post-title">${post.title}</h2>
        <p class="blog-post-excerpt">${post.excerpt}</p>
        <a class="blog-post-link" href="./blog/${post.slug}/">read more →</a>
      </li>
    `).join('');
  }

  fetch('./blog.json')
    .then(r => r.json())
    .then(data => {
      blogPosts = data.reverse();
      renderBlog();
    })
    .catch(() => renderBlog());

  // Passive event listeners for better scroll performance
  document.addEventListener('touchstart', function () { }, { passive: true });
  document.addEventListener('touchmove', function () { }, { passive: true });

  window.openSsLightbox = function (src) {
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

  window.closeSsLightbox = function () {
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