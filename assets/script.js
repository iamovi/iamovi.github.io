(function () {
  const THEME_KEY = "theme";
  
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