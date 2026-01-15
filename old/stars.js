// Create the star container
const starContainer = document.createElement('div');
starContainer.className = 'stars';
document.body.appendChild(starContainer);

// Create the moon
const moon = document.createElement('div');
moon.className = 'moon';
document.body.appendChild(moon);

const STAR_COUNT = 180;

for (let i = 0; i < STAR_COUNT; i++) {
  const star = document.createElement('div');

  // Depth randomness
  const depthRand = Math.random();
  let depthClass, duration;

  if (depthRand < 0.6) {
    depthClass = 'far';
    duration = Math.random() * 8 + 6;
  } else if (depthRand < 0.9) {
    depthClass = 'mid';
    duration = Math.random() * 6 + 4;
  } else {
    depthClass = 'near';
    duration = Math.random() * 4 + 3;
  }

  star.className = `star ${depthClass}`;
  star.style.top = `${Math.random() * 100}%`;
  star.style.left = `${Math.random() * 100}%`;
  star.style.animationDuration = `${duration}s`;
  star.style.animationDelay = `${Math.random() * duration}s`;

  starContainer.appendChild(star);
}
