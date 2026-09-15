# RAYA paper website

An academic project page based on the Nerfies template and an interactive explainer for **RAYA: Learning Where and When to Intervene for Robot Recovery**.

## Run locally

Requires Node.js 18 or newer; no dependency installation needed.

```sh
npm run dev
```

Open http://localhost:3000. Override the port with `PORT=3001 npm run dev`.

```sh
npm run check
```

## Contents

- `index.html`: paper narrative, abstract, results, hardware evidence, PDF links.
- `static/css/`: Nerfies template and Bulma styles.
- `styles.css`: RAYA additions, responsive layout, focus styles, reduced-motion support.
- `app.js`: data-backed quadrotor and vehicle replays, recorded failure markers, and two synchronized hardware video grids.
- `track-scene.js`: original F1TENTH renderer assets and camera projection for four cars in one shared scene.
- `assets/data/`: 520 simulated episodes and their configurations, source commit, and policy hashes.
- `scripts/export-replays.py`: reproducible export from the supplied safe-reachability checkout.
- `assets/`: supplied manuscript, user-provided framework/hardware/results PNGs, and resource icons.
- `server.mjs`: dependency-free local preview server with streamed responses, HTTP byte-range requests, and HEAD support for video playback.

For static hosting, publish `index.html`, `styles.css`, `app.js`, `track-scene.js`, `static/`, and `assets/`. No build step is needed. Google Fonts enhances the typography when online; system fonts are used as fallback.

## Scientific provenance

The supplied manuscript is the source of the title, abstract, measured results, and figures. Author names, affiliations, and the funding acknowledgment were subsequently supplied by the user. The Paper, Code, and Video header buttons are intentionally empty placeholders pending final URLs; a local PDF remains available in the research text.

## Simulation replay and video provenance

The interactive examples replay 520 episodes generated from the supplied safe-reachability source code. Positions and failure times come from simulator logs. Quadrotor paths are projected onto a still frame from the supplied hardware footage for intuition; this is not a camera-calibrated reconstruction. Failed trajectories freeze at their first recorded failure, with a red cross on the robot. The page highlights selected demonstrations (quad seed 0; car placement 50), explicitly chosen to show three baseline failures and RAYA completion at the featured condition. The wind/friction slider preserves time and selects a full logged run for that same seed. No outcomes or failure thresholds are edited.

- Quadrotor: Figure-8 wind and heavy-plant transfer, wind multipliers 6–12, paired seeds 0–4, four controllers (280 episodes).
- Vehicle: periodic strips at periods 3, 4, and 5 s, friction μ 0.20–0.40, four evenly spaced placements, four controllers (240 episodes).
- The supplied checkout’s frozen quadrotor configuration differs from the attached paper’s final evaluation. The page identifies these as new code-based replays and keeps the manuscript’s aggregate tables separate. Details and reproduction commands: [`assets/data/README.md`](assets/data/README.md).

Two 2×2 hardware recording grids sit immediately below the hardware image. Both use the order Nominal MPC, In-solver CBF, Post hoc Learned Margin, RAYA. Each group supports play/pause, restart, scrubbing, and speed selection. The opening wait is removed from each clip, aligning playback approximately to **visually identified takeoff**; shorter clips hold their final frame. The remaining flights are retained at their original speed. Trim offsets and original/output durations are recorded in `assets/videos/hardware-trims.json`; `scripts/trim-hardware-videos.py` regenerates them from the untouched Downloads originals. Native controls allow individual viewing. The supplied car comparison remains explicitly labeled as simulation footage under Interactive Examples.

Browser copies are H.264 at 1280 px width, fast-start metadata, and no audio. Originals remain unchanged in Downloads:

| Website video | User-supplied source |
| --- | --- |
| `nominal-drag.mp4` | `nominal-drag-topdown-trajectory.mp4` |
| `cbf-drag.mp4` | `mpc-cbf-drag-topdown-trajectory.mp4` |
| `posthoc-drag.mp4` | `posthoc-drag-topdown-trajectory (1).mp4` |
| `raya-drag.mp4` | `raya-drag-topdown-trajectory.mp4` |
| `nominal-motor.mp4` | `nominal-motor-topdown-trajectory (1).mp4` |
| `cbf-motor.mp4` | `mpc-cbf-motor-topdown-trajectory.mp4` |
| `posthoc-motor.mp4` | `posthoc-motor-topdown-trajectory.mp4` |
| `raya-motor.mp4` | `raya-motor-loss-topdown-trajectory.mp4` |
| `f1tenth-compare.mp4` | `f1tenth-periodic-strips-compare.mp4` |

All videos are in `assets/videos/`. The composite background uses the 2-second frame from the RAYA motor clip; an adjacent floor patch covers the original drone. Drone sprites are canvas drawings. The vehicle scene uses the original car artwork, circuit, ice, and walls from `visualizations/f1tenth/render_figure8_raya_chase.py` at source commit `1a34eb69cb13cecb5b8788eea0baac2204a256fd`, with a fixed overview camera and four simultaneous replays. See `assets/scene/README.md`. Replays start paused, including for reduced-motion users.

RAYA’s learned margin is empirical, not a formal Hamilton–Jacobi reachability certificate.

## Template attribution

Adapted from [Nerfies](https://nerfies.github.io/), using its academic layout and styles. Website licensed CC BY-SA 4.0; see `TEMPLATE-LICENSE.md`. The footer retains attribution. No analytics are included.
