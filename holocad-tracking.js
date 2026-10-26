(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const style = document.createElement('style');
  style.textContent = `
    #holocadTrackingPanel{margin-top:12px;padding:12px;border:1px solid #2a4055;border-radius:9px;background:#0a1420}
    #holocadTrackingPanel .ht-head{display:flex;justify-content:space-between;align-items:center;gap:8px}
    #holocadTrackingPanel .ht-title{font:9px 'DM Mono',monospace;letter-spacing:.12em;color:#61e3e7}
    #holocadTrackingPanel .ht-status{margin:8px 0;padding:7px 8px;border:1px solid #294157;border-radius:6px;font:8px/1.5 'DM Mono',monospace;color:#84e8ff}
    #holocadTrackingPanel .ht-preview{position:relative;margin-top:8px;aspect-ratio:16/9;max-height:145px;overflow:hidden;border:1px solid #294157;border-radius:7px;background:#02060b}
    #holocadTrackingPanel video{width:100%;height:100%;object-fit:cover;transform:scaleX(-1);opacity:0;display:block}
    #holocadTrackingPanel video.live{opacity:1}
    #holocadTrackingPanel .ht-preview-label{position:absolute;inset:0;display:grid;place-items:center;color:#71869c;font:8px 'DM Mono',monospace;letter-spacing:.08em;pointer-events:none}
    #holocadTrackingPanel .ht-actions{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:8px}
    #holocadTrackingPanel .ht-actions button{min-height:34px;padding:7px 5px;background:#111e2c;border:1px solid #2a4055;border-radius:6px;color:#dbe8f4;font-size:9px;font-weight:800}
    #holocadTrackingPanel .ht-actions button.primary{background:#bdfbf2;color:#09212a;border-color:#bdfbf2}
    #holocadTrackingPanel .ht-actions button:disabled{opacity:.42;cursor:not-allowed}
    #holocadTrackingPanel .ht-note{margin:8px 0 0;font:8px/1.6 'DM Mono',monospace;color:#71869c}
    .holocad-tracking-pointer{position:fixed;z-index:10002;width:19px;height:19px;border:2px solid #61e3e7;border-radius:50%;box-shadow:0 0 0 5px #61e3e722,0 0 18px #61e3e788;transform:translate(-50%,-50%);pointer-events:none;display:none;will-change:left,top}
    .holocad-tracking-pointer.active{display:block}
    .holocad-tracking-pointer.confirming{border-color:#7ee0b6;box-shadow:0 0 0 8px #7ee0b633,0 0 22px #7ee0b6aa}
    .holocad-tracking-target{outline:2px solid #61e3e7!important;outline-offset:2px}
  `;
  document.head.appendChild(style);

  const settingsBody = $('#settingsModal .modalbody');
  if (!settingsBody || $('#holocadTrackingPanel')) return;

  const panel = document.createElement('section');
  panel.id = 'holocadTrackingPanel';
  panel.innerHTML = `
    <div class="ht-head"><div class="ht-title">HEAD &amp; EYE TRACKING</div><span id="htState" class="count">OFF</span></div>
    <div class="ht-status" id="htStatus" role="status" aria-live="polite">CAMERA OFF · READY</div>
    <div class="ht-preview"><video id="htVideo" muted playsinline aria-label="Mirrored camera preview"></video><div class="ht-preview-label" id="htPreviewLabel">CAMERA OFF</div></div>
    <div class="ht-actions">
      <button class="primary" id="htStart" type="button">Start tracking</button>
      <button id="htCalibrate" type="button" disabled>Calibrate center</button>
      <button id="htMode" type="button" disabled>Pointer mode: HEAD</button>
      <button id="htBlink" type="button" disabled>Blink click: OFF</button>
      <button id="htDwell" type="button" disabled>Eye scroll: OFF</button>
      <button id="htPause" type="button" disabled>Pause tracking</button>
      <button id="htStop" type="button" disabled>Stop camera</button>
    </div>
    <p class="ht-note">Move your head or gaze to steer the pointer. Blink over a button, machine, component, or canvas to activate it. Eye scroll uses the pointer at the top or bottom edge of a scrollable panel. Camera frames stay in this browser.</p>
  `;
  settingsBody.appendChild(panel);

  const video = $('#htVideo'), previewLabel = $('#htPreviewLabel'), status = $('#htStatus'), state = $('#htState');
  const startButton = $('#htStart'), calibrateButton = $('#htCalibrate'), modeButton = $('#htMode');
  const blinkButton = $('#htBlink'), dwellButton = $('#htDwell'), pauseButton = $('#htPause'), stopButton = $('#htStop');
  let stream = null, landmarker = null, raf = 0, paused = false;
  let blinkConfirm = false, dwellScroll = false, pointerMode = 'head';
  let baseline = null, smoothed = null, eyeBaseline = null, eyeSmoothed = null;
  let closedAt = 0, lastFrameAt = 0, lastConfirmAt = 0, blinkConsumed = false;
  let dwellTarget = null, dwellDirection = 0, dwellStartedAt = 0, lastDwellScrollAt = 0;
  let pointer = null, pointerX = innerWidth / 2, pointerY = innerHeight / 2;

  function say(text, active = false) {
    status.textContent = text;
    status.style.color = active ? '#7ee0b6' : '#84e8ff';
  }
  function ensurePointer() {
    if (pointer) return pointer;
    pointer = document.createElement('div');
    pointer.className = 'holocad-tracking-pointer';
    pointer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(pointer);
    return pointer;
  }
  function updatePointer(x, y) {
    const previousX = pointerX, previousY = pointerY;
    pointerX = Math.max(6, Math.min(innerWidth - 6, x));
    pointerY = Math.max(6, Math.min(innerHeight - 6, y));
    const node = ensurePointer();
    node.style.left = pointerX + 'px';
    node.style.top = pointerY + 'px';
    node.classList.add('active');
    const hit = document.elementFromPoint(pointerX, pointerY);
    document.querySelectorAll('.holocad-tracking-target').forEach(el => el.classList.remove('holocad-tracking-target'));
    if (hit && hit.closest && hit.closest('button,.item,.tool,.card,.viewport,select,input,textarea')) {
      const target = hit.closest('button,.item,.tool,.viewport,select,input,textarea');
      if (target && target !== pointer && !target.matches('#settingsModal *')) target.classList.add('holocad-tracking-target');
    }
  }
  function setButtons(active) {
    calibrateButton.disabled = !active;
    modeButton.disabled = !active;
    blinkButton.disabled = !active;
    dwellButton.disabled = !active;
    pauseButton.disabled = !active;
    stopButton.disabled = !active;
    startButton.disabled = active;
    modeButton.textContent = 'Pointer mode: ' + (pointerMode === 'head' ? 'HEAD' : 'EYE GAZE');
    blinkButton.textContent = 'Blink click: ' + (blinkConfirm ? 'ON' : 'OFF');
    dwellButton.textContent = 'Eye scroll: ' + (dwellScroll ? 'ON' : 'OFF');
    pauseButton.textContent = paused ? 'Resume tracking' : 'Pause tracking';
    state.textContent = active ? (paused ? 'PAUSED' : 'ON') : 'OFF';
  }
  function findControlAtPointer() {
    const hit = document.elementFromPoint(pointerX, pointerY);
    if (!hit) return null;
    if (hit.closest && hit.closest('#holocadTrackingPanel')) return hit.closest('button');
    return hit.closest('button,a[href],input[type="button"],input[type="checkbox"],input[type="radio"],input[type="range"],select,summary,[role="button"],canvas');
  }
  function activateCanvasAtPointer(canvas) {
    try {
      const x = pointerX, y = pointerY;
      const common = { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, buttons: 1, detail: 1 };
      canvas.dispatchEvent(new PointerEvent('pointerdown', { ...common, pointerId: 41, pointerType: 'mouse', isPrimary: true }));
      canvas.dispatchEvent(new PointerEvent('pointerup', { ...common, pointerId: 41, pointerType: 'mouse', isPrimary: true, buttons: 0 }));
      canvas.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, detail: 1 }));
      say('Blink click · 3D viewport', true);
    } catch (_) { say('Could not activate the 3D viewport.'); }
  }
  function safeConfirmAtPointer() {
    const now = performance.now();
    if (now - lastConfirmAt < 420) return;
    lastConfirmAt = now;
    const control = findControlAtPointer();
    if (!control || control.matches(':disabled,[aria-disabled="true"]')) {
      say('Move the pointer over an enabled control or machine component.');
      return;
    }
    if (control === pointer) return;
    if (control.matches('canvas#scene')) { activateCanvasAtPointer(control); return; }
    try {
      control.focus({ preventScroll: true });
      if (control.matches('input[type="checkbox"],input[type="radio"]')) control.click();
      else control.click();
      say('Blink click · ' + ((control.getAttribute('aria-label') || control.textContent || control.id || 'control').trim().replace(/\s+/g, ' ').slice(0, 48)), true);
    } catch (_) { say('Could not activate that control.'); }
  }
  function findScrollableAtPointer() {
    const nodes = document.elementsFromPoint(pointerX, pointerY);
    for (const node of nodes) {
      if (!node || node === pointer) continue;
      let current = node;
      while (current && current !== document.body) {
        if (current instanceof HTMLElement) {
          const cs = getComputedStyle(current);
          if (/(auto|scroll|overlay)/.test(cs.overflowY) && current.scrollHeight > current.clientHeight + 4) return current;
        }
        current = current.parentElement;
      }
    }
    return null;
  }
  function updateDwellScroll(now) {
    if (!dwellScroll || !stream || paused || !baseline) { dwellTarget = null; dwellDirection = 0; dwellStartedAt = 0; return; }
    const target = findScrollableAtPointer();
    if (!target) { dwellTarget = null; dwellDirection = 0; dwellStartedAt = 0; return; }
    const rect = target.getBoundingClientRect();
    const edge = Math.min(64, Math.max(28, rect.height * .18));
    let direction = 0;
    if (pointerY <= rect.top + edge && target.scrollTop > 0) direction = -1;
    else if (pointerY >= rect.bottom - edge && target.scrollTop + target.clientHeight < target.scrollHeight - 1) direction = 1;
    if (!direction) { dwellTarget = null; dwellDirection = 0; dwellStartedAt = 0; return; }
    if (target !== dwellTarget || direction !== dwellDirection) { dwellTarget = target; dwellDirection = direction; dwellStartedAt = now; lastDwellScrollAt = now; return; }
    if (now - dwellStartedAt < 300) return;
    const elapsed = Math.min(50, now - lastDwellScrollAt);
    lastDwellScrollAt = now;
    target.scrollTop += direction * Math.max(4, elapsed * .72);
  }
  function blendshape(categories, name) {
    const entry = categories && categories.find(item => item.categoryName === name);
    return entry ? entry.score : 0;
  }
  async function loadLandmarker() {
    const vision = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm');
    const files = await vision.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm');
    return vision.FaceLandmarker.createFromOptions(files, {
      baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task', delegate: 'CPU' },
      runningMode: 'VIDEO', numFaces: 1, outputFaceBlendshapes: true,
      minFaceDetectionConfidence: .55, minFacePresenceConfidence: .55, minTrackingConfidence: .55
    });
  }
  function tick() {
    if (!stream || !landmarker || paused || document.hidden) {
      if (stream && !paused) raf = requestAnimationFrame(tick);
      return;
    }
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      const now = performance.now();
      if (now - lastFrameAt >= 45) {
        lastFrameAt = now;
        try {
          const result = landmarker.detectForVideo(video, now);
          const face = result.faceLandmarks && result.faceLandmarks[0];
          if (face && face[1]) {
            const nose = face[1];
            const sample = { x: nose.x, y: nose.y };
            if (face[468] && face[473]) {
              const eyeSample = { x: (face[468].x + face[473].x) / 2, y: (face[468].y + face[473].y) / 2 };
              if (!eyeSmoothed) eyeSmoothed = eyeSample;
              else { eyeSmoothed.x += (eyeSample.x - eyeSmoothed.x) * .28; eyeSmoothed.y += (eyeSample.y - eyeSmoothed.y) * .28; }
            }
            if (!smoothed) smoothed = sample;
            else { smoothed.x += (sample.x - smoothed.x) * .22; smoothed.y += (sample.y - smoothed.y) * .22; }
            if (baseline) {
              let x, y;
              if (pointerMode === 'eye' && eyeBaseline && eyeSmoothed) {
                x = (.5 - (eyeSmoothed.x - eyeBaseline.x) * 7.0) * innerWidth;
                y = (.5 + (eyeSmoothed.y - eyeBaseline.y) * 8.0) * innerHeight;
              } else {
                x = (.5 - (smoothed.x - baseline.x) * 3.2) * innerWidth;
                y = (.5 + (smoothed.y - baseline.y) * 3.2) * innerHeight;
              }
              updatePointer(x, y);
              say(blinkConfirm ? 'TRACKING · BLINK CLICK ON' : 'TRACKING · ' + pointerMode.toUpperCase(), true);
            }
            const categories = result.faceBlendshapes && result.faceBlendshapes[0] && result.faceBlendshapes[0].categories;
            const left = blendshape(categories, 'eyeBlinkLeft'), right = blendshape(categories, 'eyeBlinkRight');
            const closed = (left + right) / 2 > .38 && Math.min(left, right) > .18;
            if (closed && closedAt === 0) { closedAt = now; blinkConsumed = false; }
            if (!closed) {
              closedAt = 0;
              blinkConsumed = false;
              if (pointer) pointer.classList.remove('confirming');
            } else if (blinkConfirm && !blinkConsumed && closedAt > 0 && now - closedAt >= 70) {
              blinkConsumed = true;
              if (pointer) pointer.classList.add('confirming');
              safeConfirmAtPointer();
            }
          }
          updateDwellScroll(now);
        } catch (error) {
          say('Tracking frame error · retrying');
        }
      }
    }
    raf = requestAnimationFrame(tick);
  }
  async function start() {
    if (stream) return;
    try {
      say('REQUESTING CAMERA…');
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      video.srcObject = stream;
      await video.play();
      video.classList.add('live');
      previewLabel.hidden = true;
      say('LOADING FACE TRACKER…');
      landmarker = await loadLandmarker();
      baseline = null; smoothed = null; eyeBaseline = null; eyeSmoothed = null; paused = false;
      calibrate();
      setButtons(true);
      say('TRACKING · HEAD · CALIBRATED', true);
      cancelAnimationFrame(raf); raf = requestAnimationFrame(tick);
    } catch (error) {
      stop();
      const message = error && error.name === 'NotAllowedError' ? 'CAMERA PERMISSION DENIED' : 'CAMERA/TRACKER START FAILED';
      say(message + ' · use HTTPS/localhost and allow camera');
    }
  }
  function calibrate() {
    if (smoothed) baseline = { x: smoothed.x, y: smoothed.y };
    if (eyeSmoothed) eyeBaseline = { x: eyeSmoothed.x, y: eyeSmoothed.y };
    if (pointer) updatePointer(innerWidth / 2, innerHeight / 2);
    say('CENTER CALIBRATED · ' + (pointerMode === 'head' ? 'HEAD' : 'EYE GAZE'), true);
  }
  function toggleMode() {
    pointerMode = pointerMode === 'head' ? 'eye' : 'head';
    if (smoothed) baseline = { x: smoothed.x, y: smoothed.y };
    if (eyeSmoothed) eyeBaseline = { x: eyeSmoothed.x, y: eyeSmoothed.y };
    setButtons(true);
    say('POINTER MODE · ' + (pointerMode === 'head' ? 'HEAD' : 'EYE GAZE'), true);
  }
  function pause() {
    paused = !paused;
    setButtons(true);
    if (!paused) { cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); }
    say(paused ? 'TRACKING PAUSED' : 'TRACKING RESUMED', true);
  }
  function stop() {
    cancelAnimationFrame(raf); raf = 0;
    if (stream) stream.getTracks().forEach(track => track.stop());
    stream = null;
    if (video) { video.pause(); video.srcObject = null; video.classList.remove('live'); }
    previewLabel.hidden = false;
    previewLabel.textContent = 'CAMERA OFF';
    if (pointer) pointer.classList.remove('active');
    if (landmarker && typeof landmarker.close === 'function') { try { landmarker.close(); } catch (_) {} }
    landmarker = null; baseline = null; smoothed = null; eyeBaseline = null; eyeSmoothed = null; paused = false;
    setButtons(false); say('CAMERA OFF · READY');
  }

  startButton.addEventListener('click', start);
  calibrateButton.addEventListener('click', calibrate);
  modeButton.addEventListener('click', toggleMode);
  blinkButton.addEventListener('click', () => { blinkConfirm = !blinkConfirm; setButtons(true); say('BLINK CLICK · ' + (blinkConfirm ? 'ON' : 'OFF'), true); });
  dwellButton.addEventListener('click', () => { dwellScroll = !dwellScroll; setButtons(true); say('EYE SCROLL · ' + (dwellScroll ? 'ON' : 'OFF'), true); });
  pauseButton.addEventListener('click', pause);
  stopButton.addEventListener('click', stop);
  window.addEventListener('resize', () => { if (pointer && stream) updatePointer(Math.min(innerWidth - 6, pointerX), Math.min(innerHeight - 6, pointerY)); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && stream && !paused) { cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); } });
  setButtons(false);
})();
