(() => {
  'use strict';

  // The tracking cursor is visual only. It must never block normal mouse,
  // touch, library, assembly, inspector, or toolbar selection.
  const style = document.createElement('style');
  style.textContent = '.holocad-tracking-pointer{pointer-events:none!important;}';
  document.head.appendChild(style);

  const getPointer = () => document.querySelector('.holocad-tracking-pointer.active');
  const syntheticPointerId = 7391;
  let lastX = null;
  let lastY = null;
  let lastSampleAt = 0;
  let activeCanvas = null;
  let dragging = false;

  function canvasAt(x, y) {
    const hit = document.elementFromPoint(x, y);
    if (!hit) return null;
    const viewport = hit.closest && hit.closest('.viewport');
    if (!viewport) return null;
    return viewport.querySelector('canvas#scene, canvas');
  }

  function withCaptureDisabled(canvas, fn) {
    // OrbitControls normally captures a real pointer. Synthetic pointer IDs
    // cannot be captured reliably, so temporarily make capture a no-op only
    // while our synthetic event is being handled. Real input is untouched.
    const originalSet = canvas.setPointerCapture;
    const originalRelease = canvas.releasePointerCapture;
    try {
      canvas.setPointerCapture = () => {};
      canvas.releasePointerCapture = () => {};
      return fn();
    } finally {
      canvas.setPointerCapture = originalSet;
      canvas.releasePointerCapture = originalRelease;
    }
  }

  function beginDrag(canvas, x, y) {
    if (!canvas || dragging) return;
    dragging = true;
    activeCanvas = canvas;
    lastX = x;
    lastY = y;
    const event = new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      pointerId: syntheticPointerId,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: x,
      clientY: y,
      button: 0,
      buttons: 1
    });
    withCaptureDisabled(canvas, () => canvas.dispatchEvent(event));
  }

  function endDrag() {
    if (!dragging || !activeCanvas) {
      dragging = false;
      activeCanvas = null;
      return;
    }
    const canvas = activeCanvas;
    const x = lastX == null ? 0 : lastX;
    const y = lastY == null ? 0 : lastY;
    const event = new PointerEvent('pointerup', {
      bubbles: true,
      cancelable: true,
      pointerId: syntheticPointerId,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: x,
      clientY: y,
      button: 0,
      buttons: 0
    });
    withCaptureDisabled(canvas, () => document.dispatchEvent(event));
    dragging = false;
    activeCanvas = null;
  }

  function moveWorkshopWithTracking(x, y) {
    const canvas = canvasAt(x, y);
    if (!canvas) {
      endDrag();
      lastX = lastY = null;
      return;
    }

    const now = performance.now();
    if (now - lastSampleAt < 24) return;
    lastSampleAt = now;

    if (activeCanvas && activeCanvas !== canvas) endDrag();
    if (!dragging) beginDrag(canvas, x, y);

    if (lastX === null || lastY === null) {
      lastX = x;
      lastY = y;
      return;
    }

    let dx = x - lastX;
    let dy = y - lastY;
    lastX = x;
    lastY = y;

    // Same-direction movement as the tracking cursor, with a small noise
    // dead-zone and jump cap for stable head/eye tracking.
    if (Math.abs(dx) < 0.75 && Math.abs(dy) < 0.75) return;
    dx = Math.max(-32, Math.min(32, dx));
    dy = Math.max(-32, Math.min(32, dy));

    const event = new PointerEvent('pointermove', {
      bubbles: true,
      cancelable: true,
      pointerId: syntheticPointerId,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: x,
      clientY: y,
      movementX: dx,
      movementY: dy,
      button: 0,
      buttons: 1
    });
    document.dispatchEvent(event);
  }

  function sample() {
    const pointer = getPointer();
    if (!pointer) {
      endDrag();
      lastX = lastY = null;
      requestAnimationFrame(sample);
      return;
    }

    const rect = pointer.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    moveWorkshopWithTracking(x, y);
    requestAnimationFrame(sample);
  }

  window.addEventListener('blur', endDrag, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) endDrag();
  }, { passive: true });
  requestAnimationFrame(sample);
})();
