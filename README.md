# HOLOCAD — Engineering Studio

HoloCAD is a browser-based, interactive 3D engineering exploration prototype. Phase 01 established the workspace and illustrative assemblies; **Phase 02 adds optional camera-based hand gesture controls** while preserving mouse, keyboard, and touch interaction.

## Included

### Studio and 3D viewport
- Responsive engineering workspace with a Three.js viewport.
- Five illustrative procedural assemblies: four-cylinder engine, gearbox, turbine rotor, centrifugal pump, and robotic joint.
- Click/tap component selection and an inspector with explanatory properties.
- Orbit, pan, zoom, reset, scale, wireframe, visibility/isolation, and illustrative exploded spacing.
- Browser-local view saving, settings, and responsive inspector.

### Phase 02 — Hand gesture engine
- Camera access is requested only after the user presses **Gestures**; it can be stopped at any time.
- MediaPipe Hand Landmarker tracks up to two hands in the browser.
- **Pinch (thumb + index):** select a component; move while pinched to orbit.
- **Open palm:** orbit the camera by moving the hand.
- **Two hands:** move them apart or together to scale the assembly.
- **Index-point hold:** hold still for about 0.6 seconds to inspect a component.
- **Closed fist:** move sideways to rotate the assembly.
- On-screen status and virtual cursor; optional mirrored camera preview.
- Attempts GPU inference first and falls back to CPU if GPU setup is unavailable.
- Camera frames are processed locally by the HoloCAD gesture code. Camera access requires a secure context (GitHub Pages HTTPS or localhost), browser permission, and a supported device/browser.
- Gesture tracking uses public MediaPipe CDN assets and its hosted hand-landmarker model. The first activation needs an internet connection to load them.
- Manual mouse, touch, toolbar, and keyboard controls remain available if camera access is denied or gesture tracking is off.

## Run locally
Serve the folder over HTTP (ES modules and camera access may not work from a local file URL). For example, run Python's built-in HTTP server on port 8000 and open localhost:8000. Allow camera permission when enabling hand controls.

## GitHub Pages
In repository **Settings → Pages**, choose **GitHub Actions** as the publishing source. Pushes to `main` trigger deployment. The workflow checks that `index.html` exists and runs a JavaScript syntax check before uploading the Pages artifact.

## Known limitations / next phases
- Geometry is illustrative, not manufacturing-grade CAD; dimensions and materials are not validated engineering specifications.
- Gesture recognition may vary with lighting, camera angle, hand visibility, and device performance. Use the manual controls as a fallback.
- The 50+ assembly/component library, advanced measurements and annotations, richer exploded-view controls, and optional OpenRouter-powered explanations remain future phases.
- Three.js, MediaPipe, the hand model, and fonts are loaded from public CDNs. Do not put private API keys in the frontend.
