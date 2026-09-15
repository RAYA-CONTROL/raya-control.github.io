# Original F1TENTH scene

These assets reuse the scene renderer and artwork behind the author's supplied `f1tenth-periodic-strips-compare.mp4`:

- Repository: `ishaanamahajan/safe-reachability`
- Commit: `1a34eb69cb13cecb5b8788eea0baac2204a256fd`
- Renderer: `visualizations/f1tenth/render_figure8_raya_chase.py`
- Artwork: `formula_car_rear_chase_magenta.png`, `f1tenth_club_circuit_backdrop.png`

`f1tenth-circuit.jpg` is the original renderer's ground, road, ice, and environment from a fixed overview camera. `f1tenth-car.png` is prepared by its original chroma-key routine. `f1tenth-scene.json` records camera, ground homography, projected wall faces, and provenance. The browser depth-sorts the original wall faces with all four car sprites. Positions and heading indicators follow exported simulator samples. Sprites remain upright billboards as in the source renderer.

The scene uses the selected replay's 4 s strip period and phase 2.02 (placement 50). Ice visualizes the time schedule along the reference path. It is presentation scenery: low grip remains time-scheduled and barriers do not have collision physics. The fixed camera lets all four runs share the view and stay visible at their failure endpoints. The source video remains available separately on the page.

To reproduce with Python, NumPy, Pillow, imageio, SciPy, and contourpy installed:

```sh
python3 scripts/export-track-scene.py --repo /path/to/safe-reachability
```

The renderer revision and simulation revision are recorded independently; scene generation does not change controller outcomes.
