# Simulation replay data

These are **new simulator runs from the supplied source**, not original hardware trajectories or the final paper's trajectory archive. The supplied checkout documents different quadrotor results from the attached manuscript; do not substitute these subsets for its aggregate tables.

## Source and selection

- Source: the user's `safe-reachability` checkout. Exact commit and policy SHA-256 hashes are in `provenance.json`.
- Quad: `train_learned_authority_rl.py`'s `QUAD_BASE`, Figure-8 and OOD-C heavy-plant scenarios, frozen `learned_authority_rl_cegis_v3/quad/final_policy.csv`, smoothing 0.7.
- Car: corrected-grid `BASE`, scenario placements from its frozen `manifest.csv`, strict no-mu policy `no_mu_authority_car/limo/final_policy.csv`, smoothing 0.7.
- Quad seeds 0–4 and car placement indices 0, 25, 50, 75 were selected **before execution**, independently of outcomes. Every selected condition includes all four controllers. This describes the full exported dataset. The website now highlights **outcome-selected demonstrations**: quad seed 0 at wind 10 and car placement 50 at μ = 0.30 / period 4. Both show three baseline failures and RAYA completion. The selection is explicit in `featured-examples.json`; each slider holds its selected seed/placement fixed. These featured successes are not aggregate evidence.
- The code's legacy method names are `vanilla` (Nominal MPC), `analytic_in_solver_cbf` (In-solver CBF), `posthoc_learned` / `saber_posthoc` (Post hoc Learned Margin), and `saber_no_oracle` / `car_saber_no_oracle_adaptive` with the frozen learned scheduler (RAYA).

`provenance.json` gives every command, policy hash, source commit, raw CSV hash, failure index, and outcome. `${SAFE_REACHABILITY}`, `${SIM_BUILD}`, and `${LOGS}` are placeholders for local directories. Full raw CSVs and stdout logs are retained in the temporary directory printed by the exporter.

## Samples and failure semantics

`quad-replays.json` and `car-replays.json` contain arrays ordered as:

```
[time_seconds, x_metres, y_metres, z_metres, angle_radians, authority_weight]
```

All step samples are retained, rounded to five decimal places. The quad angle is roll; the car angle is heading. Car z is zero. The simulator writes post-integration states labeled by the preceding step: exported times add one integration step (0.05 s quad, 0.1 s car) to represent the physical sample time.

- Quad failure: first row with `combined_fail=1`. This includes floor/attitude/angular-rate failure, not necessarily an observed physical crash. `survival_combined` is checked against the exported result.
- Car failure: the final step of a run with `success=0`; the evaluator terminates on track, slip, or spinout failure. The reason is taken from its summary metrics.
- A red cross appears at that sample time. The visual freezes the failed trajectory there, even if the quad simulation continued logging. Full samples remain in the JSON.
- Samples are held between solver steps; the browser does not manufacture new dynamics. At timeline zero, the first available post-step sample is displayed.
- Quad projection uses one common XY map for every wind level of the selected seed, fitted to the wooden floor; it does not move the camera between slider values. The map is presentation-only, not camera calibration. Vehicle projection uses the original chase renderer’s road, ice, car artwork, barrier geometry, and camera equations, with a fixed shared overview camera. Reference y is `1.5 sin(0.15t) cos(0.15t)`, matching the evaluator. The cars are billboard sprites, as in the original renderer; a colored heading line uses logged heading. Blue ice shows the reference-path overview of time-scheduled friction, not physical patch-contact dynamics.

## Reproduce

Use a checkout at the commit in `provenance.json`, CMake, a C++17 compiler, and Python 3.10+ (standard library only):

```sh
cmake -S "$SAFE_REACHABILITY/TinyMPC" -B /tmp/raya-sim-build -DCMAKE_BUILD_TYPE=Release
cmake --build /tmp/raya-sim-build --target quadrotor_tracking_real_wind_demo car_safety_eval -j 4
python3 scripts/export-replays.py --repo "$SAFE_REACHABILITY" --build /tmp/raya-sim-build
python3 scripts/verify-replays.py
```

The exporter reads configurations from the source runner, executes 520 episodes, verifies simulator success against failure flags, and writes the browser data and manifest. Source repository files are not edited. Numerical details can vary across compiler/platform builds; commands, checkpoints, source commit, and raw-log hashes record this export's provenance.
