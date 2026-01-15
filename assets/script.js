(function () {
  const THEME_KEY = "theme";
  
  // Music Player
  let audio = null;
  let isPlaying = false;
  
  window.initMusicPlayer = function() {
    // Replace 'your-song.mp3' with the path to your audio file
    audio = new Audio('https://ik.imagekit.io/iamovi/portfo/highanddry.mp3?updatedAt=1705702443879');
    audio.loop = true; // Enable looping
    
    audio.addEventListener('ended', function() {
      isPlaying = false;
      updatePlayButton();
    });
  };
  
  window.toggleMusic = function() {
    if (!audio) {
      initMusicPlayer();
    }
    
    if (isPlaying) {
      audio.pause();
      isPlaying = false;
    } else {
      audio.play();
      isPlaying = true;
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
    menu.classList.toggle('open');
    overlay.classList.toggle('show');
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