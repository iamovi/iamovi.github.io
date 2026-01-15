// =============================================
// CUSTOM SMOOTH SCROLL + RAINBOW PROGRESS SCROLLBAR
// =============================================

// Detect touch device → use native scroll on mobile
const isTouchDevice = 'ontouchstart' in window ||
                     navigator.maxTouchPoints > 0 ||
                     window.matchMedia('(pointer:coarse)').matches;

// Scroll state (desktop only)
let currentScroll = window.scrollY;
let targetScroll = window.scrollY;
let isScrolling = false;

// Tuning (cinematic desktop feel)
const SPEED = 0.055;
const WHEEL_MULT = 0.52;
const OVERSHOOT = 0.008;
const STOP_THRESHOLD = 0.4;

// =============================================
// DESKTOP SMOOTH SCROLL (wheel/mouse)
// =============================================
function onWheel(e) {
    if (isTouchDevice) return; // native on touch
    e.preventDefault();

    targetScroll += e.deltaY * WHEEL_MULT;

    const maxScroll = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        document.body.scrollHeight - window.innerHeight,
        1
    );
    targetScroll = Math.max(0, Math.min(targetScroll, maxScroll));

    if (!isScrolling) {
        isScrolling = true;
        requestAnimationFrame(animateScroll);
    }
}

function animateScroll() {
    const diff = targetScroll - currentScroll;
    currentScroll += diff * SPEED;
    currentScroll += diff * OVERSHOOT; // nice bounce

    window.scrollTo(0, currentScroll);

    // Update rainbow color RIGHT HERE in the same loop → super smooth!
    updateRainbowColor();

    if (Math.abs(diff) > STOP_THRESHOLD) {
        requestAnimationFrame(animateScroll);
    } else {
        // Final perfect snap
        currentScroll = targetScroll;
        window.scrollTo(0, currentScroll);
        updateRainbowColor(); // one last update
        isScrolling = false;
    }
}

// =============================================
// RAINBOW COLOR UPDATE (called from animation loop)
// =============================================
function updateRainbowColor() {
    const root = document.documentElement;
    const maxScroll = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        document.body.scrollHeight - window.innerHeight,
        1
    );

    const progress = window.scrollY / maxScroll;           // real progress 0→1
    const targetHue = progress * 360;

    // Smoothly approach target (lower = silkier, higher = snappier)
    let currentHue = parseFloat(root.style.getPropertyValue('--scroll-hue')) || 340;
    currentHue += (targetHue - currentHue) * 0.18;         // ← tune this (0.1–0.4 feels nice)

    root.style.setProperty('--scroll-hue', currentHue.toFixed(1));
}

// =============================================
// INIT
// =============================================
if (!isTouchDevice) {
    window.addEventListener('wheel', onWheel, { passive: false });
}

// Keep state in sync when using trackpad / scrollbar / keyboard
window.addEventListener('scroll', () => {
    if (!isScrolling) {
        currentScroll = window.scrollY;
        targetScroll = window.scrollY;
        updateRainbowColor(); // still update color even without custom scroll
    }
}, { passive: true });

// Initial color update
updateRainbowColor();