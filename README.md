# HOLOCAD — Engineering Studio

Phase 01 is a static, browser-based engineering studio prototype.

## Included
- Responsive dark engineering workspace.
- Interactive Three.js viewport with illustrative procedural 3D assemblies.
- Component selection by click/tap and inspector descriptions.
- Orbit, pan, zoom, reset, scaling, wireframe and illustrative exploded spacing.
- Five starter assemblies: engine, gearbox, turbine rotor, centrifugal pump and robotic joint.
- Browser-local view saving, settings and responsive inspector.
- GitHub Actions workflow for GitHub Pages deployment.

## Local development
Serve this folder over HTTP (ES modules may not work from a local file URL). For example, use Python's built-in HTTP server on port 8000 and open localhost:8000.

## GitHub Pages
In repository Settings → Pages, choose GitHub Actions as the source. Pushes to main trigger deployment; the workflow can also be run manually from Actions.

## Phase 01 limitations
Models are illustrative geometry, not manufacturing-grade CAD. Camera gesture controls, the complete 50+ machine and component libraries, advanced measurements and annotations, and optional OpenRouter integration are later phases. Three.js and fonts load from public CDNs. No API secrets are included in the frontend.
