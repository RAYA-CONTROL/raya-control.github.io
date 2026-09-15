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
- `app.js`: canvas drone/car scenes, shared disturbance control, pause, reset, and automatic sweep.
- `assets/`: supplied manuscript, user-provided framework/hardware/results PNGs, and resource icons.
- `server.mjs`: dependency-free local preview server.

For static hosting, publish `index.html`, `styles.css`, `app.js`, `static/`, and `assets/`. No build step is needed. Google Fonts enhances the typography when online; system fonts are used as fallback.

## Scientific provenance

The supplied manuscript is the source of the title, abstract, measured results, and figures. Author names, affiliations, and the funding acknowledgment were subsequently supplied by the user. The Paper, Code, and Video header buttons are intentionally empty placeholders pending final URLs; a local PDF remains available in the research text.

The playground is an **illustrative animation**, not a physics engine, controller implementation, experimental replay, or calibrated survival predictor. Its twelve robots per method and deterministic intensity-dependent failure thresholds are explanatory design choices. The 0–100 slider has no physical units. It deliberately permits all controllers to fail at extreme intensity. Actual results appear separately, including hardware contact/recovery nuance and experiment sample sizes.

Reachability background: https://control.ee.ethz.ch/research/theory/research-theory-reachability.html . RAYA's learned margin is empirical and is not represented as a certified Hamilton–Jacobi reachable set.

To replace the animation with replayed experiments, supply per-controller trajectories, failure events, and shared seeds/geometry indexed by actual disturbance/friction conditions. Replace the illustrative `survivors` and `scene` functions in `app.js`, and update the slider units and provenance text accordingly.

## Template attribution

Adapted from [Nerfies](https://nerfies.github.io/), using its academic layout and styles. Website licensed CC BY-SA 4.0; see `TEMPLATE-LICENSE.md`. The footer retains attribution. No analytics are included.
