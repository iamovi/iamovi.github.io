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
    // Save current section to sessionStorage (no URL change)
    sessionStorage.setItem('section', sectionName);

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

  // On load, restore section from sessionStorage
  document.addEventListener('DOMContentLoaded', function () {
    const valid = ['about', 'projects', 'blog', 'claude', 'guestbook'];
    const saved = sessionStorage.getItem('section');
    if (saved && valid.includes(saved)) {
      showSection(saved);
    }
  });

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
            ${reactionBar('project', slugify(p.name))}
          </li>
        `).join('');
        loadReactionCounts(slice.map(p => ({ type: 'project', id: slugify(p.name) })));
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
        ${reactionBar('blog', post.slug)}
      </li>
    `).join('');
    loadReactionCounts(blogPosts.map(p => ({ type: 'blog', id: p.slug })));
  }

  fetch('./blog.json')
    .then(r => r.json())
    .then(data => {
      blogPosts = data.reverse();
      renderBlog();
    })
    .catch(() => renderBlog());

  // ── REACTIONS ──
  const REACTIONS = [
    { key: 'skull', label: '💀' },
    { key: 'fire',  label: '🔥' },
    { key: 'alien', label: '👾' },
    { key: 'lol',   label: '[ lol ]' },
  ];

  function slugify(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function hasReacted(type, id, key) {
    try { return localStorage.getItem('r:' + type + ':' + id + ':' + key) === '1'; } catch(e) { return false; }
  }

  function markReacted(type, id, key) {
    try { localStorage.setItem('r:' + type + ':' + id + ':' + key, '1'); } catch(e) {}
  }

  function reactionBar(type, id) {
    const btns = REACTIONS.map(r => {
      const reacted = hasReacted(type, id, r.key);
      const cls = 'reaction-btn' + (reacted ? ' reacted' : '');
      const countId = 'rc-' + type + '-' + id + '-' + r.key;
      return `<button class="${cls}" onclick="addReaction('${type}','${id}','${r.key}',this)" title="${r.key}"><span class="reaction-emoji">${r.label}</span><span class="reaction-count" id="${countId}">·</span></button>`;
    }).join('');
    return `<div class="reaction-bar" data-type="${type}" data-id="${id}">${btns}</div>`;
  }

  function loadReactionCounts(targets) {
    if (!targets || targets.length === 0) return;
    // build filter: (target_type.eq.blog,target_id.eq.my-slug),(...)
    const filters = targets.map(t => 'and(target_type.eq.' + t.type + ',target_id.eq.' + t.id + ')').join(',');
    fetch(SUPABASE_URL + '/rest/v1/reactions?select=target_type,target_id,reaction&or=(' + encodeURIComponent(filters) + ')', {
      headers: gbHeaders()
    })
      .then(r => r.json())
      .then(rows => {
        if (!Array.isArray(rows)) return;
        // tally counts
        const counts = {};
        rows.forEach(row => {
          const k = row.target_type + ':' + row.target_id + ':' + row.reaction;
          counts[k] = (counts[k] || 0) + 1;
        });
        // fill in the spans
        targets.forEach(t => {
          REACTIONS.forEach(r => {
            const el = document.getElementById('rc-' + t.type + '-' + t.id + '-' + r.key);
            if (el) {
              const n = counts[t.type + ':' + t.id + ':' + r.key] || 0;
              el.textContent = n > 0 ? n : '·';
            }
          });
        });
      })
      .catch(() => {});
  }

  window.addReaction = function (type, id, key, btn) {
    if (hasReacted(type, id, key)) return; // already reacted
    btn.classList.add('reacted');
    markReacted(type, id, key);

    // optimistically update count
    const countEl = document.getElementById('rc-' + type + '-' + id + '-' + key);
    if (countEl) {
      const cur = parseInt(countEl.textContent) || 0;
      countEl.textContent = cur + 1;
    }

    fetch(SUPABASE_URL + '/rest/v1/reactions', {
      method: 'POST',
      headers: { ...gbHeaders(), 'Prefer': 'return=minimal' },
      body: JSON.stringify({ target_type: type, target_id: id, reaction: key })
    }).catch(() => {
      // rollback on failure
      btn.classList.remove('reacted');
      if (countEl) {
        const cur = parseInt(countEl.textContent) || 1;
        countEl.textContent = cur - 1 > 0 ? cur - 1 : '·';
      }
    });
  };

  // ── GUESTBOOK ──
  const SUPABASE_URL = 'https://nusyixchzeiplwwmqlbw.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51c3lpeGNoemVpcGx3d21xbGJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3Njk3MTMsImV4cCI6MjA4OTM0NTcxM30.niaCbSuBZSNlHOnM0EsUTGWow6ZxLA0t1YuJaA8Uixw';

  function gbHeaders() {
    return {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
    };
  }

  function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    const days = Math.floor(hrs / 24);
    if (days < 30) return days + 'd ago';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderReplyForm(parentId) {
    return `
      <div class="gb-reply-form" id="reply-form-${parentId}">
        <div class="guestbook-form-row">
          <input type="text" class="gb-input gb-reply-name" placeholder="your name (or anon)" maxlength="40" autocomplete="off" />
          <button class="gb-submit gb-reply-btn" onclick="submitReply(${parentId})">[ reply ]</button>
          <button class="gb-cancel-btn" onclick="closeReplyForm(${parentId})">[ x ]</button>
        </div>
        <textarea class="gb-textarea gb-reply-msg" placeholder="your reply..." maxlength="300" rows="2"
          oninput="this.closest('.gb-reply-form').querySelector('.gb-reply-chars').textContent = this.value.length"></textarea>
        <div class="gb-char-count"><span class="gb-reply-chars">0</span> / 300</div>
        <div class="gb-reply-status"></div>
      </div>
    `;
  }

  function buildTree(all, parentId) {
    return all
      .filter(m => (m.parent_id ?? null) === (parentId ?? null))
      .sort((a, b) => parentId === null
        ? new Date(b.created_at) - new Date(a.created_at)  // top-level: newest first
        : new Date(a.created_at) - new Date(b.created_at)  // replies: oldest first
      )
      .map(m => ({ ...m, children: buildTree(all, m.id) }));
  }

  function renderNode(m) {
    const childrenHtml = m.children.length
      ? `<div class="gb-replies">${m.children.map(c => renderNode(c)).join('')}</div>`
      : '';
    return `
      <div class="gb-message-item" id="msg-${m.id}">
        <div class="gb-message-meta">
          <span class="gb-message-name">${escapeHtml(m.name || 'anon')}</span>
          <span class="gb-message-date">${timeAgo(m.created_at)}</span>
        </div>
        <p class="gb-message-text">${escapeHtml(m.message)}</p>
        <button class="gb-reply-toggle" onclick="toggleReplyForm(${m.id})">[ reply ]</button>
        ${reactionBar('comment', String(m.id))}
        ${childrenHtml}
      </div>
    `;
  }

  function loadGuestbook() {
    const container = document.getElementById('gb-messages');
    const countEl = document.getElementById('guestbook-count');
    if (!container) return;

    container.innerHTML = `<div class="gb-loading">[ loading messages... ]</div>`;

    fetch(`${SUPABASE_URL}/rest/v1/guestbook?select=*&order=created_at.asc`, {
      headers: gbHeaders()
    })
      .then(r => r.json())
      .then(data => {
        if (!data || data.length === 0) {
          container.innerHTML = `<p class="gb-empty">[ no messages yet — be the first ]</p>`;
          if (countEl) countEl.textContent = '';
          return;
        }

        const tree = buildTree(data, null);
        if (countEl) countEl.textContent = tree.length + ' message' + (tree.length !== 1 ? 's' : '');
        container.innerHTML = tree.map(m => renderNode(m)).join('');
        loadReactionCounts(data.map(m => ({ type: 'comment', id: String(m.id) })));
      })
      .catch(() => {
        if (container) container.innerHTML = `<p class="gb-empty">[ failed to load messages ]</p>`;
      });
  }

  window.toggleReplyForm = function (parentId) {
    const existing = document.getElementById(`reply-form-${parentId}`);
    if (existing) { existing.remove(); return; }
    const msgEl = document.getElementById(`msg-${parentId}`);
    if (!msgEl) return;
    const toggle = msgEl.querySelector(':scope > .gb-reply-toggle');
    toggle.insertAdjacentHTML('afterend', renderReplyForm(parentId));
    msgEl.querySelector(`#reply-form-${parentId} .gb-reply-name`).focus();
  };

  window.closeReplyForm = function (parentId) {
    const form = document.getElementById(`reply-form-${parentId}`);
    if (form) form.remove();
  };

  window.submitReply = function (parentId) {
    const form = document.getElementById(`reply-form-${parentId}`);
    if (!form) return;

    const nameEl = form.querySelector('.gb-reply-name');
    const msgEl = form.querySelector('.gb-reply-msg');
    const statusEl = form.querySelector('.gb-reply-status');
    const btn = form.querySelector('.gb-reply-btn');

    const name = (nameEl.value.trim() || 'anon').slice(0, 40);
    const message = msgEl.value.trim();

    if (!message) {
      statusEl.textContent = '[ reply cannot be empty ]';
      statusEl.style.color = '#8b2020';
      return;
    }

    btn.disabled = true;
    statusEl.textContent = '[ posting... ]';
    statusEl.style.color = '';

    fetch(`${SUPABASE_URL}/rest/v1/guestbook`, {
      method: 'POST',
      headers: { ...gbHeaders(), 'Prefer': 'return=minimal' },
      body: JSON.stringify({ name, message, parent_id: parentId })
    })
      .then(r => {
        if (!r.ok) throw new Error('Failed');
        loadGuestbook();
      })
      .catch(() => {
        statusEl.textContent = '[ something went wrong ]';
        statusEl.style.color = '#8b2020';
        btn.disabled = false;
      });
  };

  window.submitGuestbook = function () {
    const nameEl = document.getElementById('gb-name');
    const msgEl = document.getElementById('gb-message');
    const statusEl = document.getElementById('gb-status');
    const btn = document.querySelector('.gb-submit');

    const name = (nameEl.value.trim() || 'anon').slice(0, 40);
    const message = msgEl.value.trim();

    if (!message) {
      statusEl.textContent = '[ message cannot be empty ]';
      statusEl.className = 'gb-status error';
      return;
    }

    btn.disabled = true;
    statusEl.textContent = '[ posting... ]';
    statusEl.className = 'gb-status';

    fetch(`${SUPABASE_URL}/rest/v1/guestbook`, {
      method: 'POST',
      headers: { ...gbHeaders(), 'Prefer': 'return=minimal' },
      body: JSON.stringify({ name, message })
    })
      .then(r => {
        if (!r.ok) throw new Error('Failed');
        statusEl.textContent = '[ message posted! ]';
        statusEl.className = 'gb-status success';
        nameEl.value = '';
        msgEl.value = '';
        document.getElementById('gb-chars').textContent = '0';
        loadGuestbook();
      })
      .catch(() => {
        statusEl.textContent = '[ something went wrong, try again ]';
        statusEl.className = 'gb-status error';
      })
      .finally(() => { btn.disabled = false; });
  };

  // char counter for main form
  document.addEventListener('DOMContentLoaded', function () {
    const msgEl = document.getElementById('gb-message');
    const charsEl = document.getElementById('gb-chars');
    if (msgEl && charsEl) {
      msgEl.addEventListener('input', () => {
        charsEl.textContent = msgEl.value.length;
      });
    }
  });

  // lazy load guestbook when section becomes visible
  let gbLoaded = false;
  const _origShowSectionForGb = window.showSection;
  window.showSection = function (sectionName) {
    _origShowSectionForGb(sectionName);
    if (sectionName === 'guestbook' && !gbLoaded) {
      gbLoaded = true;
      loadGuestbook();
    }
  };

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