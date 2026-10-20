# Last light: the WebGPU ocean

The piece at `/sketches/ocean-sunset` renders Santa Monica Bay at the current minute as a dense
cloud of grains, in the manner of
[cullenwebber/three-ml-sharp](https://github.com/cullenwebber/three-ml-sharp): every grain carries
GPU state, drifts on a noise flow field, and reforms at home, so the scene reads as a single-image
reconstruction that breathes and frays. The earlier Three.js ocean remains at
`/sketches/ocean-sunset/webgl` for browsers without WebGPU.

## Inputs

- **Time.** `computeWorldParams` (`src/lib/horizon/world.ts`) gives the solar and lunar azimuth and
  elevation for Los Angeles. The camera faces today's sunset azimuth from 8 m above the water, so
  the sun sets inside the frame in every season. Stars turn with local sidereal time. The lunar
  track is the horizon model's approximation, not an ephemeris.
- **Weather.** The live Open-Meteo reading shared with the ASCII ocean (`weather.ts`, cached for six
  hours). Wind sets the wave spectrum, sea roughness, cloud drift and grain drift; cloud cover sets
  the cloud threshold and the occlusion of sun and moon; humidity and precipitation set the aerosol
  haze. Changes ease in over a few seconds.

## Passes

1. `sky.wgsl`, every frame: single scattering (Rayleigh, Mie, ozone) through a spherical atmosphere
   into a 128 × 64 table indexed by relative azimuth and √elevation, plus sun and moon transmittance
   and cloud cover in front of each.
2. `field.wgsl`, one invocation per grain: place and light the grain, then advance its life and flow
   offset. Sea grains sum twelve Gerstner waves (a westerly swell and a Pierson–Moskowitz wind sea),
   reflect the sky by Fresnel, and show the glint stochastically: each grain catches the light with
   a probability that matches the expected Beckmann radiance under Cox–Munk roughness, with resolved
   and filtered slopes kept apart. Sky grains carry advected fBm clouds lit by forward and multiple
   scattering. Exposure adapts to the sky's luminance with partial adaptation.
3. `grains.wgsl`: one camera-facing quad per grain with the demo's bead shading, depth tested.
4. `bloom.wgsl`, `present.wgsl`: half- and sixteenth-resolution blur, the demo's power-curve
   contrast and saturation, ACES, sRGB, dither.

Grain count scales with canvas area (about 0.7 per device pixel at DPR ≤ 1.25, 150k to 1.1M), and
grain size is solved for 90% coverage. Darkness comes from where the scene thins (the upper sky, the
frame's edges), not from gaps between grains.

## Evaluation — October 19, 2026

Headless Chrome for Testing on the development Mac (Metal), full queue drain after every frame, 60
frames after warm-up. CPU and GPU time together; not a phone or energy benchmark.

| Canvas              | Grains  | ms per frame |
| ------------------- | ------- | ------------ |
| 1440 px, DPR 1      | 711,245 | 6.7          |
| 1280 px, DPR 2→1.25 | 909,720 | 8.4          |
| 390 × 844, DPR 3    | 183,769 | 2.0          |

The component caps at 30 fps, renders a still under reduced motion (refreshed each minute), and
stops submitting while paused, offscreen or hidden. All shaders validate natively:

```sh
for shader in sky field; do cat src/lib/particles/vgpu/{common,$shader}.wgsl > "/tmp/$shader.wgsl"; done
for shader in /tmp/{sky,field}.wgsl src/lib/particles/vgpu/{grains,bloom,present}.wgsl; do
  bunx --no-install vgpu check "$shader" --require-validation
done
```

Native validation needs GPU access, which the Claude Code sandbox blocks.

## References

- C. Cox and W. Munk, "Measurement of the roughness of the sea surface from photographs of the sun's
  glitter," _Journal of the Optical Society of America_ 44(11), 1954.
  [doi:10.1364/JOSA.44.000838](https://doi.org/10.1364/JOSA.44.000838)
- W. J. Pierson and L. Moskowitz, "A proposed spectral form for fully developed wind seas based on
  the similarity theory of S. A. Kitaigorodskii," _Journal of Geophysical Research_ 69(24), 1964.
  [doi:10.1029/JZ069i024p05181](https://doi.org/10.1029/JZ069i024p05181)
- T. Nishita, T. Sirai, K. Tadamura and E. Nakamae, "Display of the Earth taking into account
  atmospheric scattering," _SIGGRAPH_ 1993.
  [doi:10.1145/166117.166140](https://doi.org/10.1145/166117.166140)
- S. Hillaire, "A scalable and production ready sky and atmosphere rendering technique," _Computer
  Graphics Forum_ 39(4), EGSR 2020. [doi:10.1111/cgf.14050](https://doi.org/10.1111/cgf.14050)
- M. Finch, "Effective water simulation from physical models," _GPU Gems_, ch. 1, 2004.
  [developer.nvidia.com](https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-1-effective-water-simulation-physical-models)
- I. McEwan, D. Sheets, M. Richardson and S. Gustavson, "Efficient computational noise in GLSL,"
  _Journal of Graphics Tools_ 16(2), 2012.
  [doi:10.1080/2151237X.2012.649621](https://doi.org/10.1080/2151237X.2012.649621)
- L. G. Henyey and J. L. Greenstein, "Diffuse radiation in the galaxy," _Astrophysical Journal_
  93, 1941. [doi:10.1086/144246](https://doi.org/10.1086/144246)
