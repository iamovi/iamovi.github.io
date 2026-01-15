const modeBtn = document.querySelector('.mode');
const icon = modeBtn.querySelector('i');

// Load saved theme
if (localStorage.getItem('theme') === 'dark') {
  document.body.classList.add('dark-mode');
  icon.classList.replace('fa-moon', 'fa-sun');
}

modeBtn.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');

  const isDark = document.body.classList.contains('dark-mode');

  icon.classList.toggle('fa-moon', !isDark);
  icon.classList.toggle('fa-sun', isDark);

  localStorage.setItem('theme', isDark ? 'dark' : 'light');
});
