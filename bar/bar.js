// =============================================
// CUSTOM SMOOTH SCROLL + RAINBOW PROGRESS SCROLLBAR
// v2 — much better mobile/touch behavior
// =============================================

const isTouchDevice = 'ontouchstart' in window ||
                     navigator.maxTouchPoints > 0 ||
                     window.matchMedia('(pointer:coarse)').matches;

let currentScroll = window.scrollY;
let targetScroll = window.scrollY;
let isScrolling = false;

// ─── Tuning ────────────────────────────────────────
const DESKTOP_SPEED      = 0.045;
const DESKTOP_WHEEL_MULT = 0.52;
const DESKTOP_OVERSHOOT  = 0.008;
const STOP_THRESHOLD     = 0.4;

const TOUCH_LERP         = 0.085;     // 0.06 ~ 0.11 feels good on mobile
const TOUCH_STOP_THRESHOLD = 0.9;     // higher = stops faster

// =============================================
// SCROLL HANDLING
// =============================================
function onWheel(e) {
    if (isTouchDevice) return; // ← native on touch devices

    e.preventDefault();

    targetScroll += e.deltaY * DESKTOP_WHEEL_MULT;

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

    // Different smoothing depending on input method
    const speed = isTouchDevice ? TOUCH_LERP : DESKTOP_SPEED;
    const threshold = isTouchDevice ? TOUCH_STOP_THRESHOLD : STOP_THRESHOLD;
    const overshoot = isTouchDevice ? 0 : DESKTOP_OVERSHOOT;

    currentScroll += diff * speed;
    currentScroll += diff * overshoot;

    window.scrollTo({ top: currentScroll, behavior: 'instant' });

    updateRainbowColor();

    if (Math.abs(diff) > threshold) {
        requestAnimationFrame(animateScroll);
    } else {
        // Final snap
        currentScroll = targetScroll;
        window.scrollTo({ top: currentScroll, behavior: 'instant' });
        updateRainbowColor();
        isScrolling = false;
    }
}

// =============================================
// RAINBOW PROGRESS (called every frame)
// =============================================
function updateRainbowColor() {
    const root = document.documentElement;
    const maxScroll = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        document.body.scrollHeight - window.innerHeight,
        1
    );

    const progress = Math.min(1, Math.max(0, window.scrollY / maxScroll));
    const targetHue = progress * 360;

    let currentHue = parseFloat(root.style.getPropertyValue('--scroll-hue')) || 340;
    currentHue += (targetHue - currentHue) * 0.18;

    root.style.setProperty('--scroll-hue', currentHue.toFixed(1));
}

// =============================================
// TOUCH / MOMENTUM handling
// =============================================
let touchRafId = null;

function onTouchMove() {
    if (!isTouchDevice) return;

    // We only want to update color during natural touch scroll
    // (we don't force our own smooth scroll on mobile)

    if (touchRafId === null) {
        touchRafId = requestAnimationFrame(touchColorUpdate);
    }
}

function touchColorUpdate() {
    updateRainbowColor();
    touchRafId = null;

    // Keep updating while user is scrolling
    if (Math.abs(window.scrollY - currentScroll) > 1.5) {
        touchRafId = requestAnimationFrame(touchColorUpdate);
    }
    currentScroll = window.scrollY; // sync
}

// =============================================
// INIT & EVENT LISTENERS
// =============================================
if (!isTouchDevice) {
    window.addEventListener('wheel', onWheel, { passive: false });
} else {
    // Mobile → just color rainbow on natural scroll
    window.addEventListener('scroll', onTouchMove, { passive: true });
}

// Also update when using scrollbar / keyboard / other inputs
window.addEventListener('scroll', () => {
    if (!isScrolling) {
        currentScroll = window.scrollY;
        targetScroll = window.scrollY;
        updateRainbowColor();
    }
}, { passive: true });

// Initial color
updateRainbowColor();