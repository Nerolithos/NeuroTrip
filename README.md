# NeuroTrip - A Kaleidoscope of Consciousness

NeuroTrip is an interactive neuro-storytelling web experience designed for hackathon demo flow.
Instead of explaining the brain with static cards, it makes the interface behave like distributed brain systems.

## Adventure-X Theme Fit: Kaleidoscope

- The same stimulus is reprojected through different region logics.
- Interaction changes network structure, activation signatures, and scene behavior.
- Final output is a generated consciousness pattern remixed from the user journey.

Core line:

> Consciousness is not a picture. It is a kaleidoscope.

## Core Innovations in This MVP

- UI = brain function simulation, not only text explanation.
- Disconnect Region mode changes how the page behaves.
- Behavior-to-brain mapping is data-driven from local JSON.
- Journey summary and neural kaleidoscope are reproducible from interaction-derived seed.

## Phase-1 MVP Scope

Implemented first-line playable flow:

1. Gateway
2. Behavior Selection
3. Brain Map + Network Graph + Activation Signature
4. Visual Cortex scene
5. Amygdala scene
6. Hippocampus scene
7. Default Mode Network scene
8. Exit summary
9. Sources page

Primary narrative:

> What happens when you see something frightening?

## Tech Stack

- React 19
- TypeScript (strict)
- Vite
- React Router
- Zustand
- Framer Motion
- D3 force layout
- Local JSON data

## Project Structure

```text
src/
  components/
  scenes/
    GatewayScene/
    BehaviorScene/
    BrainMapScene/
    VisualCortexScene/
    AmygdalaScene/
    HippocampusScene/
    DefaultModeScene/
    ExitScene/
    SourcesScene/
  visualizations/
    BrainNetwork/
    ActivationSignature/
    Kaleidoscope/
  data/
  hooks/
  stores/
  styles/
  types/
  utils/
```

## Data Notes

Data files:

- `src/data/regions.json`
- `src/data/behaviors.json`
- `src/data/connections.json`
- `src/data/sources.json`
- `src/data/story.json`

All values are currently normalized illustrative prototype values for storytelling.
They are aggregated and simplified for visual communication, not participant-level clinical measurements.

## Scientific Disclaimer

NeuroTrip is an artistic and educational visualization inspired by neuroscience research.
It is not a medical diagnostic tool, and its interactive effects are simplified representations rather than literal simulations of brain function.

## Local Development

```bash
npm install
npm run dev
```

Type check + production build:

```bash
npm run build
```

## Demo Script (3-5 minutes)

1. Enter Gateway and begin trip.
2. Select Fear behavior.
3. Show distributed participation in Brain Map.
4. Enter Visual Cortex and modulate stimulus controls.
5. Enter Amygdala and demonstrate salience increase by cursor speed.
6. Disconnect Amygdala and observe behavioral calm shift.
7. Enter Hippocampus and reconstruct fragment memories.
8. Enter Default Mode and pause to amplify kaleidoscope narration.
9. Exit with generated journey signature.
10. Open Sources to show scientific grounding and limits.

## Next Phase Plan

- Add Broca/Language, Prefrontal, and Basal Ganglia chapters.
- Expand behavior set and richer interaction-to-network mapping.
- Add optional Web Audio atmospheres with explicit user opt-in.
- Add data pipeline adapters for replacing local JSON with curated datasets.
- Add performance tier presets for low-end devices.
