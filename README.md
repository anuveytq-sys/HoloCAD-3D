# HOLOCAD — Engineering Studio

HoloCAD is a browser-based interactive 3D engineering exploration prototype.
Phase 01 established the workspace and illustrative assemblies, Phase 02 added optional camera-based hand gesture controls, and **Phase 03 adds engineering measurements, annotations, and animated assembly tools**.

## Included

### Studio and 3D viewport
- Responsive engineering workspace with a Three.js viewport.
- Five illustrative procedural assemblies: four-cylinder engine, gearbox, turbine rotor, centrifugal pump, and robotic joint.
- Click/tap component selection and an inspector with explanatory properties.
- Orbit, pan, zoom, reset, scale, wireframe, visibility/isolation, and exploded spacing.
- Browser-local view saving, settings, and responsive inspector.
- Component visibility controls to hide/isolate parts and restore all components.

### Phase 02 — Hand gesture engine
- Camera access is requested only after the user presses **Gestures**; it can be stopped at any time.
- MediaPipe Hand Landmarker tracks up to two hands in the browser.
- **Pinch (thumb + index):** select a component; move while pinched to orbit.
- **Open palm:** orbit the camera by moving the hand.
- **Two hands:** move them apart or together to scale the assembly.
- **Index-point hold:** hold still for about 0.6 seconds to inspect a component.
- **Closed fist:** move sideways to rotate the assembly.
- On-screen status and virtual cursor; the camera feed is processed internally and no face-preview window is displayed.
- Attempts GPU inference first and falls back to CPU if GPU setup is unavailable.
- Camera frames are processed locally by the HoloCAD gesture code. Camera access requires a secure context (GitHub Pages HTTPS or localhost), browser permission, and a supported device/browser.
- Gesture tracking uses public MediaPipe CDN assets and its hosted hand-landmarker model. The first activation needs an internet connection to load them.
- Manual mouse, touch, toolbar, and keyboard controls remain available if camera access is denied or gesture tracking is off.

### Phase 03 — Engineering functionality
- **Point-to-point measurement:** click two points on visible model geometry.
- **Three-point angle:** click the vertex first, then one point on each arm.
- **Bounding-box dimensions:** read X × Y × Z extents for a selected visible component.
- **Radius and diameter:** calculate the selected component's bounding-sphere radius or diameter.
- **Units:** display measurements in mm, cm, m, or inches.
- **Calibration:** set millimetres per scene unit; changing units or calibration recalculates existing linear measurements.
- **Annotations:** attach a short text note to a clicked model point; labels follow the viewport camera, and individual notes can be removed.
- **Animated exploded view:** play, pause, reverse, reset, and adjust separation.
- **Visibility tools:** hide or isolate selected parts from the inspector, restore all parts, and reset the viewport.
- Phase 03 controls live in the existing inspector; they do not replace the existing mouse, touch, toolbar, or gesture controls.

> **Measurement accuracy:** these are measurements of illustrative procedural geometry, not validated manufacturing CAD. The default calibration is 100 mm per scene unit only as an illustrative starting point. Set calibration against a known reference before interpreting dimensions. Bounding-sphere radius/diameter describe the selected mesh's bounding sphere, not necessarily a real part's engineering radius.

### Phase 04 — expanded engineering libraries\n- **60 machine assemblies:** retains the original five and adds 55 additional illustrative procedural machine assemblies across powertrain, transmission, fluid systems, energy, robotics, automation, thermal and vehicle systems.\n- **60 reusable component types:** searchable catalog covering transmission, supports, fasteners, motion, fluid power, thermal, energy, electrical, vehicle, robotics, precision and structural components.\n- **Add components to the active assembly:** choose a component, review its category and purpose, then add it to the current scene as selectable geometry.\n- **Existing tools work with the expanded library:** component inspector, gesture control, measurements, unit calibration, annotations, exploded view, hide/isolate/show-all, orbit/pan/zoom, and responsive UI remain available.\n- **Engineering metadata:** each catalog item has a category, explanatory description, illustrative material/type, and selectable geometry.\n\n> Phase 04 is a learning and exploration library. Generated machine/component geometry and material descriptions are illustrative, not validated manufacturing drawings or engineering specifications.\n\n## Run locally
Serve the folder over HTTP (ES modules and camera access may not work from a local file URL). For example, run Python's built-in HTTP server on port 8000 and open localhost:8000. Allow camera permission when enabling hand controls.

## GitHub Pages
In repository **Settings → Pages**, choose **GitHub Actions** as the publishing source. Pushes to `main` trigger deployment. The workflow checks that `index.html` exists and runs a JavaScript syntax check before uploading the Pages artifact.

## Known limitations / next phases
- Geometry is illustrative, not manufacturing-grade CAD; dimensions and materials are not validated engineering specifications.
- Gesture recognition may vary with lighting, camera angle, hand visibility, and device performance. Use the manual controls as a fallback.
- Optional AI-powered engineering explanations remain a future phase.
- Three.js, MediaPipe, the hand model, and fonts are loaded from public CDNs. Do not put private API keys in the frontend.
