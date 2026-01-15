// =============================================
// CUSTOM SMOOTH SCROLL + RAINBOW SCROLLBAR
// Desktop: slow cinematic with overshoot
// Mobile: native smooth scrolling (best experience)
// =============================================

// Detect touch device
const isTouchDevice = 'ontouchstart' in window || 
                     navigator.maxTouchPoints > 0 ||
                     window.matchMedia('(pointer:coarse)').matches;

// =============================================
// SCROLL STATE (used only on desktop)
// =============================================
let currentScroll = window.scrollY;
let targetScroll  = window.scrollY;
let isScrolling = false;

// Tuning - cinematic desktop feel
const SPEED         = 0.055;
const WHEEL_MULT    = 0.52;
const OVERSHOOT     = 0.008;
const STOP_THRESHOLD = 0.4;

// =============================================
// DESKTOP SMOOTH SCROLL (wheel/mouse)
// =============================================
function onWheel(e) {
    if (isTouchDevice) return; // skip on touch devices

    e.preventDefault();

    targetScroll += e.deltaY * WHEEL_MULT;

    const maxScroll = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        document.body.scrollHeight - window.innerHeight
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
    currentScroll += diff * OVERSHOOT; // luxurious little bounce

    window.scrollTo(0, currentScroll);

    if (Math.abs(diff) > STOP_THRESHOLD) {
        requestAnimationFrame(animateScroll);
    } else {
        // Final snap for pixel-perfect ending
        currentScroll = targetScroll;
        window.scrollTo(0, currentScroll);
        isScrolling = false;
    }
}

// Only enable custom wheel scrolling on non-touch devices
if (!isTouchDevice) {
    window.addEventListener('wheel', onWheel, { passive: false });
}

// Keep internal state in sync when user uses scrollbar / touchpad / keyboard
window.addEventListener('scroll', () => {
    if (!isScrolling) {
        currentScroll = window.scrollY;
        targetScroll = window.scrollY;
    }
}, { passive: true });

// =============================================
// COLORFUL SCROLLBAR ANIMATION (works everywhere)
// =============================================
(() => {
    const root = document.documentElement;
    let currentHue = parseFloat(root.style.getPropertyValue('--scroll-hue') || '340');

    function updateColor() {
        const maxScroll = Math.max(
            document.documentElement.scrollHeight - window.innerHeight,
            document.body.scrollHeight - window.innerHeight
        );

        const progress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
        const targetHue = progress * 360;

        currentHue += (targetHue - currentHue) * 0.28;

        root.style.setProperty('--scroll-hue', currentHue.toFixed(1));

        requestAnimationFrame(updateColor);
    }

    updateColor();
})();