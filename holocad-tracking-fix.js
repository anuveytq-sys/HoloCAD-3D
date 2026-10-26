(() => {
  'use strict';

  // Tracking cursor is visual only. Normal mouse/touch selection remains
  // completely owned by the existing HoloCAD UI.
  const style = document.createElement('style');
  style.textContent = '.holocad-tracking-pointer{pointer-events:none!important;}';
  document.head.appendChild(style);

  let lastX = null;
  let lastY = null;
  let lastSampleAt = 0;
  let lastBlinkAt = 0;

  function getTrackingPointer() {
    return document.querySelector('.holocad-tracking-pointer.active');
  }

  function rotateWorkshop(dx, dy) {
    const root = window.__holocadRoot;
    if (!root) return;

    // Match the requested COSMOSIM-style behavior: moving the tracking
    // cursor right/left rotates the workshop horizontally, and moving it
    // up/down rotates it vertically in the same direction.
    root.rotation.y += dx * 0.0022;
    root.rotation.x += dy * 0.0016;
    root.rotation.x = Math.max(-0.55, Math.min(0.55, root.rotation.x));
  }

  function sampleTrackingMotion(x, y) {
    const hit = document.elementFromPoint(x, y);
    const viewport = hit && hit.closest ? hit.closest('.viewport') : null;

    if (!viewport) {
      lastX = x;
      lastY = y;
      return;
    }

    const now = performance.now();
    if (now - lastSampleAt < 20) return;
    lastSampleAt = now;

    if (lastX === null || lastY === null) {
      lastX = x;
      lastY = y;
      return;
    }

    let dx = x - lastX;
    let dy = y - lastY;
    lastX = x;
    lastY = y;

    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
    dx = Math.max(-28, Math.min(28, dx));
    dy = Math.max(-28, Math.min(28, dy));
    rotateWorkshop(dx, dy);
  }

  // Blink-to-range: a blink over any inspector range slider sets it directly
  // to the percentage represented by the tracking cursor position. This
  // requires no mouse click and also dispatches the normal input/change events
  // used by HoloCAD's existing slider logic.
  function setRangeAtBlink() {
    const pointer = getTrackingPointer();
    if (!pointer) return;
    const x = parseFloat(pointer.style.left);
    const y = parseFloat(pointer.style.top);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;

    const hit = document.elementFromPoint(x, y);
    const range = hit && hit.closest ? hit.closest('input[type="range"]') : null;
    if (!range || range.disabled) return;

    const rect = range.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = Math.max(0, Math.min(1, (x - rect.left) / rect.width));
    const min = Number(range.min || 0);
    const max = Number(range.max || 100);
    const step = Number(range.step || 1);
    let value = min + ratio * (max - min);
    if (Number.isFinite(step) && step > 0) value = min + Math.round((value - min) / step) * step;
    value = Math.max(min, Math.min(max, value));
    range.value = String(value);
    range.focus({ preventScroll: true });
    range.dispatchEvent(new Event('input', { bubbles: true }));
    range.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // The main tracking module marks the cursor "confirming" immediately when
  // a blink is detected. Observe that state and enhance range controls without
  // replacing its existing button/component click behavior.
  const observer = new MutationObserver(() => {
    const pointer = getTrackingPointer();
    if (!pointer || !pointer.classList.contains('confirming')) return;
    const now = performance.now();
    if (now - lastBlinkAt < 500) return;
    lastBlinkAt = now;
    setRangeAtBlink();
  });
  observer.observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['class'] });

  function sample() {
    const pointer = getTrackingPointer();
    if (!pointer) {
      lastX = lastY = null;
      requestAnimationFrame(sample);
      return;
    }
    const rect = pointer.getBoundingClientRect();
    sampleTrackingMotion(rect.left + rect.width / 2, rect.top + rect.height / 2);
    requestAnimationFrame(sample);
  }

  window.addEventListener('blur', () => { lastX = lastY = null; }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) lastX = lastY = null;
  }, { passive: true });
  requestAnimationFrame(sample);
})();
