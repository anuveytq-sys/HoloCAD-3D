(() => {
  'use strict';

  // Keep the tracking cursor strictly visual so it can never sit above or
  // intercept normal mouse/touch selection in the designer libraries,
  // machine library, inspector, toolbar, or viewport.
  const style = document.createElement('style');
  style.textContent = '.holocad-tracking-pointer{pointer-events:none!important;}';
  document.head.appendChild(style);

  const pointer = () => document.querySelector('.holocad-tracking-pointer.active');
  let lastX = null;
  let lastY = null;
  let lastMoveAt = 0;
  const syntheticPointerId = 7391;

  function canvasAt(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    const viewport = el.closest && el.closest('.viewport');
    if (!viewport) return null;
    const canvas = viewport.querySelector('canvas#scene, canvas');
    return canvas || null;
  }

  function moveWorkshopWithTracking(x, y) {
    const canvas = canvasAt(x, y);
    if (!canvas) return;

    const now = performance.now();
    if (now - lastMoveAt < 28) return;
    lastMoveAt = now;

    if (lastX === null || lastY === null) {
      lastX = x;
      lastY = y;
      return;
    }

    let dx = x - lastX;
    let dy = y - lastY;
    lastX = x;
    lastY = y;

    // Ignore tiny camera noise and cap large jumps caused by a tracking
    // reacquisition so the workshop remains stable and controllable.
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
    dx = Math.max(-32, Math.min(32, dx));
    dy = Math.max(-32, Math.min(32, dy));

    // OrbitControls uses a left-button pointer drag for orbiting. A short
    // synthetic drag mirrors the direction of the gaze/head cursor without
    // touching the existing Three.js scene, raycaster, or selection logic.
    try {
      const sx = x - dx;
      const sy = y - dy;
      const down = new PointerEvent('pointerdown', {
        bubbles: true, cancelable: true, pointerId: syntheticPointerId,
        pointerType: 'mouse', isPrimary: true,
        clientX: sx, clientY: sy, button: 0, buttons: 1
      });
      const move = new PointerEvent('pointermove', {
        bubbles: true, cancelable: true, pointerId: syntheticPointerId,
        pointerType: 'mouse', isPrimary: true,
        clientX: x, clientY: y, button: 0, buttons: 1
      });
      const up = new PointerEvent('pointerup', {
        bubbles: true, cancelable: true, pointerId: syntheticPointerId,
        pointerType: 'mouse', isPrimary: true,
        clientX: x, clientY: y, button: 0, buttons: 0
      });
      canvas.dispatchEvent(down);
      document.dispatchEvent(move);
      document.dispatchEvent(up);
    } catch (_) {
      // Tracking must never affect the normal HoloCAD interaction path.
    }
  }

  function sample() {
    const p = pointer();
    if (!p) {
      lastX = lastY = null;
      requestAnimationFrame(sample);
      return;
    }
    const rect = p.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    moveWorkshopWithTracking(x, y);
    requestAnimationFrame(sample);
  }

  // Do not interfere with real user input. This listener intentionally only
  // observes clicks and leaves their propagation/default behavior untouched.
  document.addEventListener('click', () => {}, true);
  requestAnimationFrame(sample);
})();
