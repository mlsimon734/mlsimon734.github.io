# Ocean WebGPU prototype

The experiment lives at `/sketches/ocean-sunset/vgpu`; the original Three.js renderer remains at
`/sketches/ocean-sunset`. It uses vgpu 0.5.0 and preserves the procedural cloud, palette, camera,
particle counts, and 30 FPS cap.

## Rendering

- Six vertices per grain replace WebGL point sprites. Depth testing, grain lighting, ACES tone
  mapping, and sRGB output preserve the original style.
- One in 24 sea particles (3,000 desktop / 1,500 mobile) carries persistent velocity in a GPU
  storage buffer. Gravity, drag, and a flow field move the spray; particles respawn at their
  anchors. The checkbox disables this simulation and restores the analytic surface motion.
- Bloom uses separable passes at half resolution, plus a broad sun halo at one-sixteenth resolution.
  These are an approximation of the original UnrealBloomPass, not a pixel-identical port.
- The component owns animation scheduling, visibility, reduced motion, and disposal. The renderer
  owns one GPU device. WGSL uses Vite's existing raw imports; no shader loader or global Vite
  changes are required.

## Evaluation — September 14, 2026

Headless Chrome on the development Mac, DPR 1, six-second samples after warmup, sequential runs
against the dev server:

| Viewport | Renderer        | Frames/sec | Median CPU submission | 95th percentile CPU submission |
| -------- | --------------- | ---------- | --------------------- | ------------------------------ |
| 1280 px  | Original        | 30.0       | 0.4 ms                | 0.7 ms                         |
| 1280 px  | vgpu + spray    | 30.0       | 0.7 ms                | 1.2 ms                         |
| 1280 px  | vgpu, spray off | 30.0       | 0.5 ms                | 0.8 ms                         |
| 390 px   | Original        | 30.0       | 0.4 ms                | 0.6 ms                         |
| 390 px   | vgpu + spray    | 30.0       | 0.6 ms                | 0.9 ms                         |
| 390 px   | vgpu, spray off | 30.0       | 0.4 ms                | 0.8 ms                         |

These timings measure CPU work inside animation callbacks that submit draws, not GPU execution time
or energy use. A narrow viewport on a Mac is not a mobile-device benchmark. There is no demonstrated
performance improvement; keep this separate while evaluating the visual benefit.

Verified:

- All four shaders validate against the native Metal adapter.
- A 65-particle compute test exercises a partial workgroup for 600 steps: finite positions, bounded
  displacement, and 262 observed respawns.
- Both themes at desktop and 390 px: no horizontal overflow or console errors.
- Paused and reduced-motion screenshots are pixel-identical across captures.
- No continuing submissions while paused, offscreen, or hidden.
- Missing WebGPU displays a link to the original ocean.
- At this checkpoint, lint and formatting passed, but the TypeScript 7 package prevented the normal
  `bun run check` from running. An isolated TypeScript 5.9.3 run reported only the 10 existing
  writing-route errors, with no diagnostics in the prototype.

## SvelteKit 3 integration — October 2, 2026

The prototype now uses the `#lib` imports introduced on `main`. The complete worktree passes
`bun run check`, `bun run lint`, and `bun run format:check`. Both ocean routes render in the
browser, and the prototype's pause control responds without browser errors. These integration checks
do not refresh the September performance measurements above.

To validate WGSL with the installed version:

```sh
for shader in src/lib/particles/vgpu/*.wgsl; do
  bunx --no-install vgpu check "$shader" --require-validation
done
```

Native validation requires GPU access; the sandbox's adapter acquisition failed, while the same
command outside the sandbox succeeded. Screenshots, temporary harnesses, and detailed results were
kept outside the repository in `/private/tmp/ocean-validation/`.
