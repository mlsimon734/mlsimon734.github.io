import type { WaveParams, WeatherParams } from "./types";
import { smoothstep } from "./atmosphere";

/**
 * The sea is a plane seen from a fixed height. A row `s` frame-heights below the
 * horizon looks down at a depression angle whose sine is 2s (mirroring the sky's
 * sin-elevation projection in world.ts), so depth grows as 1 / tan(depression) and
 * one wave field recedes continuously to the horizon. Components whose phase moves
 * faster than a cell can show are faded out; their slope variance becomes the
 * unresolved micro-facet roughness that spreads the sun and moon into glitter.
 */

/** Frame width in units of depth: a ~90° horizontal field of view. */
const LATERAL_SPAN = 2;

interface WaveComponent {
  /** Wavenumber in radians per camera height. */
  k: number;
  /** Height amplitude in camera heights. */
  amplitude: number;
  /** Travel direction in degrees; 0 runs straight toward the viewer. */
  angle: number;
  phase: number;
}

const TAU = Math.PI * 2;

function wave(wavelength: number, amplitude: number, angle: number, phase: number): WaveComponent {
  return { k: TAU / wavelength, amplitude, angle, phase };
}

// Long Pacific swell, wind chop, and a capillary ripple layer. Each band is scaled by
// its control below; the ripple is almost always unresolved and mostly feeds roughness.
const SWELL: readonly WaveComponent[] = [
  wave(11, 0.1, -8, 0.2),
  wave(7.5, 0.07, 21, 1.3),
  wave(14, 0.08, -33, 2.1),
];
const CHOP: readonly WaveComponent[] = [
  wave(2.2, 0.03, 35, 0.7),
  wave(1.5, 0.024, -44, 1.9),
  wave(1.0, 0.017, 61, 2.8),
  wave(0.7, 0.012, -68, 4.0),
  wave(0.5, 0.008, 18, 5.1),
];
const RIPPLE: readonly WaveComponent[] = [wave(0.32, 0.004, 72, 0.4), wave(0.22, 0.0028, -79, 3.4)];

const GRAVITY = 9.81 / 6; // camera height ≈ 6 m

export interface SeaView {
  /** Distance below the horizon in frame heights. */
  s: number;
  depression: number;
  depth: number;
  /** Depth change per character row, for the anti-alias filter. */
  depthPerRow: number;
  /** Depth change per character column at the frame center. */
  lateralPerColumn: number;
}

export function seaView(s: number, width: number, height: number): SeaView {
  const sinD = Math.min(0.98, Math.max(0.004, 2 * s));
  const depression = Math.asin(sinD);
  const cosD = Math.cos(depression);
  const depth = cosD / sinD;
  return {
    s,
    depression,
    depth,
    depthPerRow: 2 / (sinD * sinD * cosD * height),
    lateralPerColumn: (LATERAL_SPAN * depth) / width,
  };
}

/** Horizontal view angle of a frame position, relative to straight ahead. */
export function viewAzimuth(u: number): number {
  return Math.atan((u - 0.5) * LATERAL_SPAN);
}

export interface SeaSample {
  /** Combined surface height with sharpened crests, about −1…1. */
  crest: number;
  /** Long swell height, −1…1; 0 where the swell has blurred into sheen. */
  swell: number;
  /** Wind chop and ripple height, −1…1; 0 where it has blurred into sheen. */
  chop: number;
  /** Share of the chop this cell can resolve. */
  chopResolved: number;
  /** Resolved facet slope across (x) and along (z) the line of sight. */
  slopeX: number;
  slopeZ: number;
  /** Unresolved per-axis slope deviation that the glitter model spreads light over. */
  roughX: number;
  roughZ: number;
  /** Wind-driven breaking, 0–1. */
  foam: number;
}

/** Cox–Munk sea-surface slope variance per axis for a wind speed in m/s. */
export function slopeVariance(windSpeed: number): number {
  return (0.003 + 0.00512 * Math.max(0, windSpeed)) / 2;
}

function windEnergy(weather: WeatherParams): number {
  return Math.max(0, Math.min(1, (weather.windSpeed - 1.5) / 16));
}

/**
 * Sample the wave field under a character cell. `u` is the column position (0–1)
 * and `view` the row's projection from `seaView`.
 */
export function sampleSea(
  u: number,
  view: SeaView,
  timeSeconds: number,
  waveParams: WaveParams,
  weather: WeatherParams,
): SeaSample {
  const energy = windEnergy(weather);
  const variance = slopeVariance(weather.windSpeed);
  // Weather headings rotate the chop fully and the long swell only slightly.
  const heading = ((((weather.windDirection - 252 + 540) % 360) - 180) * 0.45 * Math.PI) / 180;
  const x = (u - 0.5) * LATERAL_SPAN * view.depth;
  const z = view.depth;
  const swellGain = waveParams.swellScale / 24;
  const chopGain = (waveParams.chopScale / 14) * (0.45 + 1.1 * energy);
  const rippleGain = waveParams.shimmer * (0.5 + energy);

  let slopeX = 0;
  let slopeZ = 0;
  let resolvedX = 0;
  let resolvedZ = 0;

  /** Sums one band; returns its height relative to the band's full amplitude and its resolved share. */
  const band = (components: readonly WaveComponent[], gain: number, turn: number) => {
    let height = 0;
    let total = 0;
    let kept = 0;
    for (const c of components) {
      const amplitude = c.amplitude * gain;
      const angle = (c.angle * Math.PI) / 180 + heading * turn;
      const dirX = Math.sin(angle);
      // Waves run toward the viewer, so phase advances as depth decreases.
      const dirZ = -Math.cos(angle);
      const columnRate = c.k * Math.abs(dirX) * view.lateralPerColumn;
      const rowRate = c.k * Math.abs(dirZ) * view.depthPerRow;
      // Fade a component before it aliases across columns, where it would read as
      // noise. Rows may sample it sparsely (each becomes its own line of waves), but
      // once a row spans many wavelengths it averages into sheen.
      const resolve = (1 - smoothstep(0.7, 1.7, columnRate)) * (1 - smoothstep(8, 20, rowRate));
      total += amplitude;
      if (resolve <= 0) continue;

      const omega = Math.sqrt(GRAVITY * c.k);
      const theta = c.k * (dirX * x + dirZ * z) - omega * timeSeconds + c.phase;
      const a = amplitude * resolve;
      kept += a;
      height += a * Math.sin(theta);
      const slope = a * c.k * Math.cos(theta);
      slopeX += slope * dirX;
      slopeZ += slope * dirZ;
      const slopeAmplitude = a * c.k;
      resolvedX += (slopeAmplitude * slopeAmplitude * dirX * dirX) / 2;
      resolvedZ += (slopeAmplitude * slopeAmplitude * dirZ * dirZ) / 2;
    }
    const scale = Math.max(total, 1e-6);
    // A sum of sines rarely nears its full amplitude; 2× spreads it over −1…1.
    return { height: Math.max(-1, Math.min(1, (2 * height) / scale)), resolved: kept / scale };
  };

  const swell = band(SWELL, swellGain, 0.35);
  const chop = band(CHOP, chopGain, 1);
  const ripple = band(RIPPLE, rippleGain, 1.2);
  const chopHeight = 0.8 * chop.height + 0.2 * ripple.height;

  // Sharpen crests and flatten troughs, as real gravity waves do.
  const lifted = (0.5 * swell.height + 0.5 * chopHeight + 1) / 2;
  const crest = 2 * Math.pow(lifted, waveParams.crestSharpness) - 1;

  // Capillary ripples never fully resolve, so some roughness always remains; a
  // sharper reflection setting leaves less of it and crisper sparkles.
  const floor = (variance * 0.72) / Math.max(waveParams.reflectionSharpness, 0.5);
  const roughX = Math.sqrt(Math.max(floor, variance - resolvedX));
  const roughZ = Math.sqrt(Math.max(floor, variance - resolvedZ));

  const steepness = Math.hypot(slopeX, slopeZ) / Math.sqrt(variance * 2);
  const breaking = smoothstep(0.5 - 0.15 * energy, 0.95, crest) * smoothstep(0.4, 1.2, steepness);
  const foam = breaking * smoothstep(0.35, 0.85, energy);

  return {
    crest,
    swell: swell.height,
    chop: chopHeight,
    chopResolved: chop.resolved,
    slopeX,
    slopeZ,
    roughX,
    roughZ,
    foam,
  };
}

export interface LightSource {
  /** Frame x of the body, 0–1. */
  x: number;
  /** Elevation angle in radians. */
  elevation: number;
}

interface GlintGeometry {
  /** Facet tilt needed across the line of sight to reflect the body into the eye. */
  needX: number;
  /** Facet tilt needed along the line of sight. */
  needZ: number;
}

function glintGeometry(u: number, view: SeaView, light: LightSource): GlintGeometry {
  // A facet tilted by t along the view lifts the reflected ray by 2t; tilted across
  // it, the ray swings in azimuth by 2t·tan(depression). Near the horizon the path
  // therefore narrows to a line and widens toward the viewer.
  const azimuth = viewAzimuth(light.x) - viewAzimuth(u);
  return {
    needX: azimuth / (2 * Math.tan(Math.max(view.depression, 0.004))),
    needZ: (view.depression - light.elevation) / 2,
  };
}

/** Mean glitter brightness with every facet unresolved: the path's smooth body, 0–1. */
export function expectedGlint(
  u: number,
  view: SeaView,
  light: LightSource,
  windSpeed: number,
): number {
  return pathBody(glintGeometry(u, view, light), slopeVariance(windSpeed));
}

function pathBody({ needX, needZ }: GlintGeometry, variance: number): number {
  return Math.exp(-(needX * needX + needZ * needZ) / (2 * variance));
}

/** Share of the path's mean brightness every cell keeps, sparkle or not. */
const PATH_FLOOR = 0.4;

/**
 * Glitter from one cell. Resolved facets that already lean the right way catch the
 * light as bright sparkles; elsewhere the unresolved roughness gives the cell its
 * share. Sparkles ride on part of the path's mean brightness, so even glassy water
 * keeps a coherent column under the body.
 */
export function glint(
  u: number,
  view: SeaView,
  light: LightSource,
  sample: SeaSample,
  windSpeed: number,
): number {
  const geometry = glintGeometry(u, view, light);
  const variance = slopeVariance(windSpeed);
  const dx = geometry.needX + sample.slopeX;
  const dz = geometry.needZ + sample.slopeZ;
  const sparkle =
    (variance / (sample.roughX * sample.roughZ)) *
    Math.exp(
      -(dx * dx) / (2 * sample.roughX * sample.roughX) -
        (dz * dz) / (2 * sample.roughZ * sample.roughZ),
    );
  return Math.max(sparkle, PATH_FLOOR * pathBody(geometry, variance));
}

/** Schlick's Fresnel term for skylight reflected at a grazing depression angle. */
export function skyReflectance(view: SeaView): number {
  return 0.02 + 0.98 * Math.pow(1 - Math.sin(view.depression), 5);
}
