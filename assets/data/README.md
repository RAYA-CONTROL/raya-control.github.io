# Simulation examples and full-evaluation counts

The page displays **rerun trajectories** and **original evaluation survival counts**. These are simulation, not hardware motion. The quadrotor condition selector and wind slider load independently simulated fixed-condition trials; they do not alter dynamics midway through a run. The AV section plays the fixed μ = 0.30 / period 3 s video; no friction selector or numeric friction label is shown.

## Data sources

Source: `safe-reachability` commit `1a34eb69cb13cecb5b8788eea0baac2204a256fd`.

- Quad Nominal MPC, In-solver Learned Margin, Post hoc Learned Margin: `Tier 1/results/canonical_new_episodes.csv`, arms `Nominal MPC`, `Stage-1 in-solver`, `Posthoc one-step`.
- Quad Posthoc CBF and In-solver CBF: `new_results_allmethods_quad_episodes.csv`, methods `cbfqp` and `mpccbf`.
- Quad Sampling-based safety filter and Posthoc HJ: `prereg_audit/hj_rpcbf/quad_episodes.csv`, methods `rpcbf_filter` and `hj_filter`.
- Quad In-solver HJ: `prereg_audit/hj_rpcbf/quad_hjmpc_episodes.csv`, method `hj_mpc`. All three HJ/RPCBF variants use the flags in `prereg_audit/hj_rpcbf/frozen_configs.json` and the source lookup tables; table hashes are recorded in the provenance file.
- Quad and car RAYA: `Tier 1/results/t1_3_stage1_scheduler_episodes.csv`.
- Car In-solver Learned Margin: `Tier 1/results/t1_3_stage1_car_margin_episodes.csv`.
- Car Nominal MPC and Post hoc Learned Margin: `prereg_audit/car_grid_corrected/episodes.csv`.

`simulation-statistics.json` contains every condition's successes and denominator (100). Its full 4,200 quad and 3,000 car episodes per method reproduce the paper's aggregate survival rates exactly after rounding. Replays use the stage-1 learned margin (K=1), frozen learned scheduler policies, quad nominal-infeasibility fallback for posthoc, and the canonical car posthoc configuration. Simulation's in-solver method is **Learned Margin**; hardware's comparison remains **CBF**.

## Selected demonstrations

`featured-examples.json` records six selectable quadrotor conditions, each rerun across seven displayed wind levels (6–12) for all nine Figure 2A methods: 378 quadrotor replays. Figure-8 uses seed 97, Circle uses seed 0, Y-line and Star use seed 7, Turbulent Wind uses seed 31, and Heavy Plant uses seed 7. The page uses a single canvas with nine flight areas (three columns on desktop, two on narrow screens), using the paper’s method order and colors and a numbered legend. Vehicle placement 90 (seed 91090) uses period-3 strips, phase 2.715, and all five friction coefficients (0.20–0.40), giving 20 car replays.

Figure-8 seed 97 was selected because RAYA completes every displayed wind setting from 6 through 12. The sampling-based safety filter fails at 10 and 11, and all eight baselines fail at 12. The other conditions use evaluated seeds whose default wind setting shows a useful controller separation: all eight baselines fail while RAYA succeeds for Circle at 11, Y-line at 10, Star at 10, and Turbulent Wind at 9; seven baselines fail while RAYA succeeds for Heavy Plant at 10. These examples are **outcome-selected**, not representative aggregate evidence. No trajectories or outcomes are edited to favor a controller. All 398 regenerated success/failure outcomes were checked against their corresponding evaluation records. Full-evaluation quadrotor counts remain available in the exported data and paper figure. The visualization uses only each selected seed’s logged outcomes. The AV section plays only the μ = 0.30 variant for seed 91090. The three baselines fail at 13.8 s and RAYA completes the full 40 s. Metric cards average all periodic-strip trials across periods 3, 4, and 5 s, all five friction levels, and all 100 placements (1,500 trials/controller): Nominal 480/1500 = 32.0%, In-solver 596/1500 = 39.7%, Posthoc 527/1500 = 35.1%, RAYA 768/1500 = 51.2%. These averages describe the complete periodic-strip benchmark, not the video’s one condition. The caption says survival drops sharply below the illustrated grip: in period-3 strips at μ = 0.25, Posthoc still completes 10/100 while all others complete 0/100; at μ = 0.20 all four complete 0/100. All five rendered variants remain in the repository. The simulation table retains the full evaluation results.

## Reproduction

Build with CMake from the recorded source commit. **Use GCC/libstdc++ for the quadrotor**: the C++ standard libraries implement random distributions differently, so Apple's libc++ gives different wind realizations for the same integer seed. The exported quad replays use GCC 14.2.0, x86_64, with macOS 14.5 SDK; car replays use AppleClang 16.0.0, arm64.

```sh
python3 scripts/export-replays.py --repo "$SAFE_REACHABILITY" \
  --build "$CAR_BUILD" --quad-build "$QUAD_BUILD" --logs /tmp/raya-final-replays
python3 scripts/verify-replays.py
```

The exporter asserts all displayed outcomes against the ledgers. Commands, policy SHA-256 hashes, raw CSV hashes and per-trial canonical outcomes are in `provenance.json`. `${SAFE_REACHABILITY}`, `${SIM_BUILD}`, `${QUAD_BUILD}` and `${LOGS}` are directory placeholders.

## Samples and failure display

Samples: `[time_s, x_m, y_m, z_m, angle_rad, authority_weight]`, rounded to five decimal places. Quad angle is roll; car angle is heading. State timestamps add one integration step to the evaluator's pre-step labels (0.05 s quad, 0.1 s car).

The quad display holds actual samples and freezes at the first `combined_fail` flag. It then covers the method’s view with a red FAILURE overlay and the recorded failure time; surviving methods show a green SUCCESS overlay only at mission completion. Each panel reports the corresponding full-evaluation success rate across 100 seeds at the selected condition and wind. Before an outcome, no Ready/Flying status or numeric altitude is shown. This flag can indicate a floor, attitude, angular-rate or position limit; it does not always mean a physical crash. The simulated flight areas use an oblique projection with one fixed common spatial scale within each condition. Drone elevation follows logged z; altitude determines the drone’s rendered height. A shadow marks the ground projection. Failure still freezes at the first recorded failed state; no post-failure crash motion is invented. Reference paths come from the evaluator’s equations and tabulated Y-line trajectory. Each method has its own area in a shared canvas; trajectories and drone markers use the same spatial projection in every area. Selecting a condition or wind restarts the 14.05 s trial, preserving the playback state; speed defaults to 2×. Playback ends at the selected trial’s outcome. No hardware background is used.

## Friction videos

`scripts/render-friction-videos.py` uses the supplied `visualizations/f1tenth` chase-camera renderer, vehicle art, circuit geometry and scene assets. Four synchronized panels show the actual logged states at the selected friction. Camera interpolation is presentation-only. Failures freeze at the final logged sample. Friction is time-scheduled in the evaluator; blue strips illustrate that schedule and are not a new spatial-contact model.

Videos run at native simulation time, 15 fps: 40 s of simulation plus a 1 s final hold. Labels use the paper's method names and RAYA color. All F1TENTH failure overlays use the shared display label “Tracking limit.” This presentation label groups the evaluator’s different failure causes; the detailed causes (including severe slip and spinout) remain unchanged in the replay data and source logs.

The renderer needs NumPy, Pillow, imageio, SciPy, contourpy and ffmpeg. Its font paths currently target macOS. Run once for each `--mu` in `0.2 0.25 0.3 0.35 0.4`:

```sh
python3 scripts/render-friction-videos.py --repo "$SAFE_REACHABILITY" \
  --logs /tmp/raya-final-replays --mu 0.3
```
