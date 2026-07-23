# Visual Systems Console Implementation Plan

> For agentic workers: REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

Goal: Replace the current Chapter I single-scene control panel with a scientifically layered Visual Systems Console that separates optics, retina/color, routing, and cortex while preserving existing Gateway cinematic flow.

Architecture: Build a shared visual-system state and pure computation modules (optics, color, routing), then compose four linked terminal windows inside a new Chapter I scene shell. Keep current route and transition entry behavior unchanged, but remap Chapter I mount target from the current VisualCortex scene body to the new console scene.

Tech Stack: React 19, TypeScript strict mode, Zustand, D3/SVG, Canvas2D, Framer Motion, Vite.

---

## Current Codebase Analysis

1. Routing and transition
- Existing Gateway cinematic transition ends at /scene/visual-cortex in src/App.tsx and src/scenes/GatewayScene/GatewayScene.tsx.
- Chapter I currently uses src/scenes/VisualCortexScene/VisualCortexScene.tsx with a lightweight visual demo.

2. Existing scene shell and design language
- Scene chrome and chapter framing are centralized in src/components/SceneFrame.tsx.
- Global visual language is defined in src/styles/app.css and Gateway-specific language in src/scenes/GatewayScene/gateway.css.

3. State and interaction infrastructure
- Global store exists in src/stores/neuroTripStore.ts and already tracks interactions/reduced-motion.
- No dedicated visual-system state object exists yet.

4. Rendering capability check
- Canvas2D is already used in src/visualizations/Kaleidoscope/KaleidoscopeCanvas.tsx.
- D3 force graph and SVG interactions already exist in Gateway background.
- Framer Motion is already available and used.
- No WebGL-specific pipeline currently present (acceptable for MVP).

5. Script and test constraints
- Available scripts: dev, build, lint.
- No test script currently defined in package.json.

## Scientific Scope Boundaries (Must Enforce)

- OPTICS must not be labeled as cortical pathology.
- Color deficiency simulation must run in linearized color space with documented model references.
- Cortical atlas in MVP is schematic unless true mesh/parcellation data is integrated.
- All UI must include educational limitation text and avoid clinical diagnosis claims.

## Planned Existing File Modifications

- src/App.tsx
- src/scenes/VisualCortexScene/VisualCortexScene.tsx (or route handoff to new scene)
- src/components/SceneFrame.tsx (only if chapter shell hooks need extension)
- src/stores/neuroTripStore.ts (or a new focused store module)
- src/styles/app.css (global utility styles only if needed)

## Planned New Files (Primary)

- src/scenes/VisualSystemsConsole/VisualSystemsConsole.tsx
- src/scenes/VisualSystemsConsole/visualSystemsConsole.css
- src/scenes/VisualSystemsConsole/components/TerminalWindow.tsx
- src/scenes/VisualSystemsConsole/components/LiveVisualFeed.tsx
- src/scenes/VisualSystemsConsole/components/RefractionLab.tsx
- src/scenes/VisualSystemsConsole/components/ColorDeficiencyLab.tsx
- src/scenes/VisualSystemsConsole/components/VisualFieldRouting.tsx
- src/scenes/VisualSystemsConsole/components/CorticalAtlas.tsx
- src/scenes/VisualSystemsConsole/components/SourceDrawer.tsx
- src/types/visualSystem.ts
- src/data/visualSources.ts
- src/data/corticalAreas.ts
- src/visual/optics/opticalTransform.ts
- src/visual/optics/astigmaticBlur.ts
- src/visual/optics/refractionModel.ts
- src/visual/color/srgb.ts
- src/visual/color/lms.ts
- src/visual/color/machadoCvd.ts
- src/visual/color/colorDeficiencyTypes.ts
- src/visual/routing/visualFieldRouting.ts

## Shared State Design (MVP)

Single source of truth object for all windows:
- sourceImage
- sphereD, cylinderD, axisDeg
- objectDistanceM, pupilDiameterMm
- colorDeficiencyType, colorDeficiencySeverity
- selectedVisualFieldPoint
- selectedCorticalArea
- viewMode (split/processed/difference)

State ownership recommendation:
- Add a dedicated Visual Systems slice inside Zustand to avoid fragmented local states.
- Keep rendering derivations memoized and pure (selectors + pure transforms).

## Phase Plan

### Phase 1 - Scene shell and shared state
- [ ] Create VisualSystemsConsole scene shell with asymmetric terminal layout and responsive mobile stacking.
- [ ] Add shared visual input state and update functions.
- [ ] Route /scene/visual-cortex to the new scene while preserving Gateway transition endpoint.
- [ ] Keep clear non-clinical disclaimer visible in chapter shell.
- [ ] Verify reduced-motion fallback behavior for panel transitions.

Validation:
- npm run lint
- npm run build

### Phase 2 - Live Visual Feed + optical approximation core
- [ ] Build LiveVisualFeed with circular field mask and unified source image pipeline.
- [ ] Implement ordered transform chain: source -> optics -> color -> display.
- [ ] Add probe point selection and mode toggles (split/processed/difference).
- [ ] Implement optics module with explicit approximation mapping from diopter-like controls to blur kernels.
- [ ] Add anisotropic blur support rotated by axisDeg.

Validation:
- npm run lint
- npm run build

### Phase 3 - Refraction Lab window
- [ ] Implement parameter controls and presets for Sphere/Cylinder/Axis/Object Distance/Pupil.
- [ ] Build simplified ray diagram showing focal behavior and principal meridians.
- [ ] Link controls directly to LiveVisualFeed optical output and ray diagram.
- [ ] Add clear model-limit label: approximate educational model.

Validation:
- npm run lint
- npm run build

### Phase 4 - Color Deficiency Lab window
- [ ] Implement color transform pipeline with linear RGB decode/encode utilities.
- [ ] Integrate Machado severity-based transform with continuous severity control.
- [ ] Add LMS normalized response meters and confusion-view panel.
- [ ] Add source labels for Machado 2009 and Brettel-Vienot-Mollon 1997.

Validation:
- npm run lint
- npm run build

### Phase 5 - Visual Field Routing window
- [ ] Implement SVG routing diagram: field -> hemiretina -> chiasm -> LGN -> V1.
- [ ] Bind probe point to left/right/central hemifield logic.
- [ ] Highlight crossed vs uncrossed pathways correctly.
- [ ] Add anti-misconception annotation under title.

Validation:
- npm run lint
- npm run build

### Phase 6 - Cortical Atlas window (schematic but traceable)
- [ ] Add region dataset with V1/V2/V3/V4/MT+/LOC plus stream labels and hemisphere metadata.
- [ ] Implement posterior/lateral/medial/inflated-schematic view toggles.
- [ ] Add linked behavior from cortical selection to other windows:
  - V1: edge/retinotopy overlay hint
  - V4: color module emphasis
  - MT+: motion placeholder state
- [ ] Clearly mark geometry as schematic and labels as atlas-based.

Validation:
- npm run lint
- npm run build

### Phase 7 - Sources drawer + cross-window signal linking polish
- [ ] Implement compact source drawer and map each module to usedFor references.
- [ ] Add subtle signal-link pulses between active modules.
- [ ] Confirm all windows read same state and update synchronously.

Validation:
- npm run lint
- npm run build

## Test Strategy Plan

Current repo has no npm test script. MVP options:

Option A (recommended in this project state)
- Add Vitest + jsdom and create npm test script.
- Add unit tests for:
  - sRGB linearization round-trip
  - severity=0 close-to-identity behavior
  - axis normalization and bounds
  - visual hemifield routing logic
  - parameter clamping and presets

Option B (if deferring test tooling one phase)
- Keep pure modules fully isolated.
- Run deterministic manual checks and add test scaffolds now, complete runnable suite in next phase.

## Risk Register and Mitigations

1. Risk: Dashboard-like look instead of instrument-console feel.
- Mitigation: Asymmetric terminal windows, compact title bars, status lamps, active link pulses, no symmetric card grid.

2. Risk: Optics and cortical concepts blended incorrectly.
- Mitigation: Strong module boundaries and per-window disclaimers with explicit scope labels.

3. Risk: Color transform in wrong color space.
- Mitigation: Enforce transform API requiring linear RGB input/output and explicit conversion wrappers.

4. Risk: Performance degradation on slider drag.
- Mitigation: requestAnimationFrame throttling, canvas resolution scaling, memoized kernels, selective re-render boundaries.

5. Risk: Misrepresenting schematic atlas as original neuroimaging mesh.
- Mitigation: persistent schematic geometry badge + source citation link.

## Acceptance Mapping

This plan satisfies the requested MVP acceptance by enforcing:
- layered scientific separation,
- four linked core windows,
- directional astigmatism approximation,
- linear-space color deficiency model integration,
- correct visual hemifield routing logic,
- cortex labels tied to published atlases,
- shared state synchronization,
- explicit simulation limits.

## Implementation Order Recommendation

Start with Phase 1 and Phase 2 in a single branch checkpoint, then continue one phase per review cycle.
Each phase should remain deployable and visually coherent before moving to the next.
