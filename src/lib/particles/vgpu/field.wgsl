// One invocation per grain: place it, light it, and let the flow field carry it.
struct Grain { reference: vec4f, attributes: vec4f }
struct Wave { shape: vec4f, motion: vec4f }
struct Lit { position: vec4f, color: vec4f }
struct Field {
  camera: vec3f,
  time: f32,
  sun: vec3f,
  sunIntensity: f32,
  moon: vec3f,
  moonIntensity: f32,
  drift: vec2f,
  windSpeed: f32,
  cover: f32,
  haze: f32,
  exposure: f32,
  delta: f32,
  night: f32,
  sidereal: f32,
  latitude: f32,
  heading: f32,
  pixelAngle: f32,
  flowInfluence: f32,
  flowStrength: f32,
  pixelSize: f32,
  count: u32,
  waveCount: u32,
  rain: f32,
  /** Unit vector the surface wind blows toward, in the view's xz plane. */
  wind: vec2f,
  windLean: f32,
  /** The unswayed view the flow is measured in: tan(fov / 2), pitch, and eye height. */
  halfTan: f32,
  pitch: f32,
  eyeHeight: f32,
}
@group(0) @binding(0) var<storage, read> grains: array<Grain>;
@group(0) @binding(1) var<storage, read_write> state: array<vec4f>;
@group(0) @binding(2) var<storage, read_write> lit: array<Lit>;
@group(0) @binding(3) var<storage, read> lut: array<vec4f>;
@group(0) @binding(4) var<storage, read> waves: array<Wave>;
@group(0) @binding(5) var<uniform> field: Field;

const SKY_RADIUS = 4000.0;
const BODY_RADIUS = 3600.0;
// Apparent radii, enlarged from the true 0.27° so the discs read at this field of view.
const SUN_RADIUS = 0.0105;
const MOON_RADIUS = 0.0095;
const SUN_RADIANCE = 26.0;
const MOON_RADIANCE = 0.22;
const GLINT_PEAK = 9.0;
// Warm sodium and LED glow from the city behind the viewer, lifting night clouds.
const CITY_GLOW = vec3f(0.0011, 0.00065, 0.00036);
const AIRGLOW = vec3f(0.00008, 0.00012, 0.0002);

fn table(index: u32) -> vec3f { return lut[index].rgb; }

fn skyRadiance(dir: vec3f) -> vec3f {
  let uv = lutUv(dir);
  let x = uv.x * f32(LUT_W) - 0.5;
  let y = clamp(uv.y * f32(LUT_H) - 0.5, 0.0, f32(LUT_H - 1u));
  let fx = fract(x);
  let fy = y - floor(y);
  let x0 = u32(i32(floor(x)) + i32(LUT_W)) % LUT_W;
  let x1 = (x0 + 1u) % LUT_W;
  let y0 = u32(floor(y));
  let y1 = min(y0 + 1u, LUT_H - 1u);
  let bottom = mix(lut[y0 * LUT_W + x0].rgb, lut[y0 * LUT_W + x1].rgb, fx);
  let top = mix(lut[y1 * LUT_W + x0].rgb, lut[y1 * LUT_W + x1].rgb, fx);
  return mix(bottom, top, fy) + AIRGLOW;
}

fn luminance(color: vec3f) -> f32 {
  return dot(color, vec3f(0.2126, 0.7152, 0.0722));
}

// Exposure follows the sky like a camera with partial adaptation: twilight and night come up
// enough to read, but still read as darker than day.
fn adaptation() -> f32 {
  let horizon = luminance(skyRadiance(vec3f(0.0, 0.03, -1.0)));
  let above = luminance(skyRadiance(vec3f(0.0, 0.26, -0.97)));
  let zenith = luminance(skyRadiance(vec3f(0.0, 1.0, 0.0)));
  let level = 0.5 * horizon + 0.3 * above + 0.2 * zenith;
  return clamp(0.42 * pow(level, -0.7), 0.2, 260.0);
}

fn henyeyGreenstein(mu: f32, g: f32) -> f32 {
  return (1.0 - g * g) / (4.0 * PI * pow(1.0 + g * g - 2.0 * g * mu, 1.5));
}

struct SkySample { color: vec3f, cloud: f32 }

// The sky in one direction: scattered light, a narrow aureole, and lit clouds.
fn skyAt(dir: vec3f, octaves: i32) -> SkySample {
  let up = vec3f(dir.x, max(dir.y, 0.0), dir.z);
  var color = skyRadiance(up);
  let occlusion = lut[LUT_OCCLUSION].xy;
  let mu = dot(up, field.sun);
  let sunGround = table(LUT_SUN_GROUND) * (1.0 - 0.96 * occlusion.x);
  color += sunGround * field.sunIntensity * (0.0035 * pow(max(mu, 1e-6), 900.0) + 0.0009 * pow(max(mu, 1e-6), 60.0));
  color += CITY_GLOW * field.night * 0.5 * exp(-up.y * 18.0);
  let cloud = cloudDensity(up, field.drift, field.time, field.cover, octaves);
  if (cloud > 0.001) {
    let sunAloft = table(LUT_SUN_CLOUD) * field.sunIntensity * 0.13;
    let moonAloft = table(LUT_MOON_GROUND) * field.moonIntensity * 0.05;
    // Thin edges scatter forward (silver linings); thick cores self-shadow. Multiple scattering
    // inside the cloud returns much of the rest diffusely, which is why clouds read white.
    let phase = henyeyGreenstein(mu, 0.62) * 0.7 + henyeyGreenstein(mu, -0.15) * 0.3;
    let thinness = 1.0 - cloud;
    // A thick, unbroken deck (the marine layer) lets less of that through to its base.
    let diffuse = (0.1 + 0.22 * smoothstep(-0.02, 0.5, field.sun.y)) * (1.0 - 0.55 * field.cover * cloud);
    let direct = sunAloft * (phase * (1.2 + 3.5 * thinness) * exp(-cloud * 1.6) + diffuse);
    let moonPhase = henyeyGreenstein(dot(up, field.moon), 0.62);
    let ambient = (skyRadiance(vec3f(0.0, 1.0, 0.0)) * 0.6 + skyRadiance(normalize(vec3f(up.x, 0.05, up.z))) * 0.5) *
      (0.55 + 0.35 * thinness);
    let shade = direct + moonAloft * (moonPhase + 0.05) + ambient + CITY_GLOW * field.night * (1.0 + cloud);
    // Light that has crossed a thick deck has lost most of its color to repeated scattering.
    let grey = mix(shade, vec3f(luminance(shade)), 0.65 * field.cover * cloud);
    // Distant banks dissolve into the horizon haze, unless the deck is unbroken: under overcast
    // there is no clear sky behind the far cloud to dissolve into.
    let reach = CLOUD_ALTITUDE / max(up.y, 0.015);
    let distant = exp(-reach / (70000.0 / field.haze));
    let opacity = smoothstep(0.0, 0.55, cloud) * 0.94 * mix(distant, 1.0, field.cover * field.cover);
    color = mix(color, grey * (1.0 - 0.45 * field.rain), opacity);
  }
  return SkySample(color, cloud);
}

fn basis(forward: vec3f) -> mat3x3f {
  let right = normalize(cross(forward, vec3f(0.0, 1.0, 0.0)));
  return mat3x3f(right, cross(right, forward), forward);
}

// `scale` multiplies grain size; zero hides the grain.
struct Shaded { position: vec3f, color: vec3f, activity: f32, scale: f32 }

// Like a reconstruction from one photograph, the scene only exists where there is something to
// see: it frays at the frame's sides and bottom, and the sky thins into darkness overhead.
fn framePresence(uv: vec2f) -> f32 {
  return smoothstep(0.99, 0.66, abs(uv.x)) * smoothstep(-0.98, -0.72, uv.y);
}

fn skyPresence(dir: vec3f, cloud: f32) -> f32 {
  // Whole through the lower sky, dissolving from about 7° toward the top of the frame.
  let band = 1.0 - smoothstep(0.12, 0.32, dir.y);
  let glow = smoothstep(0.82, 0.997, dot(dir, field.sun)) * smoothstep(-0.12, 0.0, field.sun.y);
  return max(band, max(smoothstep(0.04, 0.35, cloud), glow));
}

// Grains leave in drifting wisps rather than as scattered holes. Where the scene is nearly whole,
// all of it stays: the flow would draw the odd gap out into a slash.
fn kept(uv: vec2f, seed: f32, presence: f32) -> f32 {
  let wisps = 0.5 + 0.5 * simplex(vec3f(uv * vec2f(2.6, 5.5), field.time * 0.015));
  return step(mix(wisps, hash(seed, 9u), 0.55), smoothstep(0.0, 0.85, presence));
}

fn shadeSky(grain: Grain) -> Shaded {
  let dir = grain.reference.xyz;
  let seen = skyAt(dir, 5);
  let presence = skyPresence(dir, seen.cloud) * framePresence(grain.attributes.zw);
  // Drift gathers at cloud edges and where the sky thins out.
  let edge = 4.0 * seen.cloud * (1.0 - seen.cloud);
  let activity = 0.85 + 0.6 * edge + 0.6 * (1.0 - presence);
  let shown = kept(grain.attributes.zw, grain.attributes.x, presence);
  // The sky is a smooth field: broader, overlapping grains keep it whole where the sea needs detail.
  return Shaded(field.camera + dir * SKY_RADIUS, seen.color, activity, 1.3 * shown);
}

fn shadeBody(grain: Grain, toward: vec3f, radius: f32) -> vec3f {
  let frame = basis(toward);
  let offset = grain.reference.xy * radius;
  return normalize(toward + frame[0] * offset.x + frame[1] * offset.y);
}

fn shadeSun(grain: Grain) -> Shaded {
  let dir = shadeBody(grain, field.sun, SUN_RADIUS);
  let r2 = dot(grain.reference.xy, grain.reference.xy);
  let seen = skyAt(dir, 5);
  let limb = 1.0 - 0.55 * (1.0 - sqrt(1.0 - min(r2, 1.0)));
  let clear = 1.0 - smoothstep(0.15, 0.85, seen.cloud);
  let disc = table(LUT_SUN_GROUND) * SUN_RADIANCE * limb * clear;
  // The sun holds still: near the horizon the flow runs along it, which would shear the disc.
  return Shaded(field.camera + dir * BODY_RADIUS, seen.color + disc, 0.0, step(0.0, dir.y));
}

fn shadeMoon(grain: Grain) -> Shaded {
  let dir = shadeBody(grain, field.moon, MOON_RADIUS);
  let r2 = min(dot(grain.reference.xy, grain.reference.xy), 1.0);
  let frame = basis(field.moon);
  // The visible hemisphere faces us; sunlight sets the terminator.
  let normal = normalize(frame[0] * grain.reference.x + frame[1] * grain.reference.y - field.moon * sqrt(1.0 - r2));
  let light = smoothstep(-0.04, 0.12, dot(normal, field.sun));
  let maria = 0.82 + 0.18 * simplex(vec3f(grain.reference.xy * 3.0, 4.2));
  let seen = skyAt(dir, 4);
  let clear = 1.0 - smoothstep(0.15, 0.85, seen.cloud);
  let disc = table(LUT_MOON_GROUND) * MOON_RADIANCE * maria * (light + 0.012) * clear;
  return Shaded(field.camera + dir * BODY_RADIUS, seen.color + disc, 0.0, step(0.0, dir.y));
}

fn shadeStar(grain: Grain) -> Shaded {
  // Equatorial to horizontal coordinates by local sidereal time.
  let ascension = grain.reference.x;
  let declination = grain.reference.y;
  let hour = field.sidereal - ascension;
  let lat = field.latitude;
  let sinAltitude = sin(lat) * sin(declination) + cos(lat) * cos(declination) * cos(hour);
  let altitude = asin(clamp(sinAltitude, -1.0, 1.0));
  let azimuth = atan2(sin(hour), cos(hour) * sin(lat) - tan(declination) * cos(lat)) + PI;
  let relative = azimuth - field.heading;
  let dir = vec3f(sin(relative) * cos(altitude), sinAltitude, -cos(relative) * cos(altitude));
  let seen = skyAt(dir, 3);
  let magnitude = grain.reference.z;
  let twinkle = 0.7 + 0.3 * sin(field.time * (2.0 + 5.0 * grain.attributes.x) + grain.attributes.x * 40.0);
  let extinction = smoothstep(0.0, 0.25, dir.y);
  let light = (0.003 + 0.03 * magnitude) * twinkle * extinction * (1.0 - smoothstep(0.1, 0.6, seen.cloud));
  // Stars hang in the void: only the sky that exists behind them shows through.
  let color = seen.color * skyPresence(dir, seen.cloud) + vec3f(0.95, 0.97, 1.0) * light;
  return Shaded(field.camera + dir * BODY_RADIUS, color, 0.0, step(0.0, dir.y));
}

fn fresnel(cosine: f32) -> f32 {
  let m = 1.0 - clamp(cosine, 0.0, 1.0);
  return 0.02 + 0.98 * m * m * m * m * m;
}

// Expected specular radiance of a rough sea under a small source: Beckmann facets whose slope
// variance is the unresolved part of Cox and Munk's wind-dependent total.
fn glint(normal: vec3f, view: vec3f, light: vec3f, variance: f32) -> f32 {
  if (light.y < -0.01) { return 0.0; }
  let half = normalize(view + light);
  let cosine = max(dot(normal, half), 0.001);
  let cos2 = cosine * cosine;
  let tan2 = (1.0 - cos2) / cos2;
  let distribution = exp(-tan2 / variance) / (PI * variance * cos2 * cos2);
  return fresnel(dot(view, half)) * distribution / (4.0 * max(dot(normal, view), 0.08));
}

fn shadeOcean(grain: Grain) -> Shaded {
  let rest = grain.reference.xyz;
  let range = length(rest - field.camera);
  let footprint = range * field.pixelAngle * 3.0;
  var position = rest;
  var normal = vec3f(0.0, 1.0, 0.0);
  var resolved = 0.0;
  var unresolved = 0.0;
  var crest = 0.0;
  var height = 0.0;
  for (var i = 0u; i < field.waveCount; i++) {
    let wave = waves[i];
    let direction = wave.shape.xy;
    let k = wave.shape.z;
    // Waves shorter than a few grain spacings would alias; their slopes join the roughness.
    let keep = smoothstep(footprint * 2.0, footprint * 6.0, 2.0 * PI / k) * step(rest.y, 0.01);
    let amplitude = wave.shape.w * keep;
    let theta = k * dot(direction, rest.xz) - wave.motion.x * field.time + wave.motion.y;
    let s = sin(theta);
    let c = cos(theta);
    let q = wave.motion.z;
    position += vec3f(q * amplitude * direction.x * c, amplitude * s, q * amplitude * direction.y * c);
    normal -= vec3f(direction.x * k * amplitude * c, q * k * amplitude * s, direction.y * k * amplitude * c);
    let slope = k * amplitude;
    let fullSlope = k * wave.shape.w;
    resolved += 0.5 * slope * slope;
    unresolved += 0.5 * fullSlope * fullSlope * (1.0 - keep * keep);
    crest += amplitude * s;
    height += wave.shape.w * keep;
  }
  normal = normalize(normal);
  let view = normalize(field.camera - position);
  let coxMunk = 0.003 + 0.00512 * field.windSpeed;
  let variance = max(coxMunk - resolved, 0.0025) + unresolved;
  let reflected = reflect(-view, normal);
  let sky = skyAt(vec3f(reflected.x, abs(reflected.y), reflected.z), 3);
  let f = fresnel(dot(normal, view));
  let occlusion = lut[LUT_OCCLUSION].xy;
  let zenith = skyRadiance(vec3f(0.0, 1.0, 0.0));
  // Water body: a little upwelling blue-green, and translucent crests when backlit.
  let body = zenith * vec3f(0.018, 0.05, 0.065);
  let lift = clamp(crest / max(height, 0.05), 0.0, 1.0);
  let sunGround = table(LUT_SUN_GROUND) * (1.0 - 0.96 * occlusion.x);
  let backlight = pow(max(dot(-view, field.sun), 1e-6), 5.0) * max(field.sun.y + 0.05, 0.0);
  let translucence = sunGround * field.sunIntensity * 0.02 * vec3f(0.1, 0.45, 0.38) * lift * lift * backlight;
  // Stochastic display of the expected glint: each grain is either catching the light or not,
  // with a probability that matches the averaged radiance. Phases drift smoothly, so the path
  // shimmers instead of flashing.
  let seed = grain.attributes.x;
  let sunExpected = glint(normal, view, field.sun, variance) * field.sunIntensity * 0.045;
  let moonExpected = glint(normal, view, field.moon, variance) * field.moonIntensity * 0.045;
  let sunSpecular = sunGround * sunExpected;
  let moonSpecular = table(LUT_MOON_GROUND) * (1.0 - 0.96 * occlusion.y) * moonExpected;
  let expected = max(sunSpecular, moonSpecular);
  let strength = max(max(expected.r, expected.g), expected.b);
  let chance = clamp(strength / GLINT_PEAK, 0.0, 1.0);
  let shimmer = 0.5 + 0.5 * sin(field.time * (1.1 + 2.6 * hash(seed, 3u)) + 6.2831 * hash(seed, 4u));
  let ripple = 0.5 + 0.5 * simplex(vec3f(grain.attributes.zw * vec2f(70.0, 190.0), field.time * 0.7));
  let catching = smoothstep(1.0 - chance, 1.0 - chance + 0.1, mix(shimmer, ripple, 0.55));
  let sparkle = (sunSpecular + moonSpecular) / max(strength, 1e-5) * max(GLINT_PEAK, strength) * catching;
  var color = sky.color * f + body * (1.0 - f) + translucence + sparkle;
  // Aerial perspective toward the horizon color in the same bearing.
  // Haze runs from 1 (dry, clear) to 4.7 (saturated, raining); never extrapolate past it.
  let visibility = mix(42000.0, 8000.0, pow(clamp((field.haze - 1.0) / 3.7, 0.0, 1.0), 1.2));
  let transmittance = exp(-range / visibility);
  let horizon = skyRadiance(normalize(vec3f(rest.x, 0.0, rest.z)));
  color = color * transmittance + horizon * (1.0 - transmittance);
  let near = smoothstep(120.0, 18.0, range);
  let presence = framePresence(grain.attributes.zw);
  let activity = (0.75 + 0.5 * smoothstep(0.35, 0.95, lift) + 0.8 * (1.0 - presence)) *
    mix(0.5, 1.0, smoothstep(2600.0, 300.0, range));
  let shown = kept(grain.attributes.zw, seed, presence);
  return Shaded(position, color, activity, (1.0 + near * 0.6) * shown);
}

// Smoothstep and its derivative with respect to x.
fn easing(e0: f32, e1: f32, x: f32) -> vec2f {
  let t = clamp((x - e0) / (e1 - e0), 0.0, 1.0);
  return vec2f(t * t * (3.0 - 2.0 * t), 6.0 * t * (1.0 - t) / (e1 - e0));
}

// Where a direction lands in the unswayed view, in screen heights from the frame's center.
fn screen(dir: vec3f) -> vec2f {
  let c = cos(field.pitch);
  let s = sin(field.pitch);
  let depth = max(dir.y * s - dir.z * c, 1e-3);
  return vec2f(dir.x, dir.y * c + dir.z * s) / depth * (0.5 / field.halfTan);
}

// Flow velocity at a point in screen heights, before scaling: the curl of a stream function that
// is noise times a gate. The gate opens where a slower noise is high and closes on the horizon,
// which makes the horizon a streamline: grains slide along it but never cross, so sky and sea
// stay separate. Wind adds a sideways shear that also vanishes on the horizon. Both terms are
// free of divergence, so grains born evenly stay evenly spread.
fn velocity(p: vec2f, slow: f32) -> vec2f {
  // A broad, gently ramped gate: a steep one would turn each open region's rim into a jet that
  // traces its outline.
  let opening = simplexGrad(vec3f(p * 1.6, slow));
  let swirl = simplexGrad(vec3f(p * 3.5, slow * 1.3 + 11.0));
  let open = easing(field.flowInfluence - 0.3, field.flowInfluence + 0.6, opening.w);
  let distance = p.y - screen(vec3f(0.0, 0.0, -1.0)).y;
  // Wide enough to keep the sun, its path and the far sea's fine bands legible.
  let wall = easing(0.0, 0.22, abs(distance));
  let gate = open.x * wall.x;
  let gateSlope = open.y * opening.xy * 1.6 * wall.x + vec2f(0.0, open.x * wall.y * sign(distance));
  let slope = gateSlope * swirl.w + gate * swirl.xy * 3.5;
  return vec2f(slope.y, -slope.x) * 0.25 + vec2f(field.wind.x * field.windLean * wall.x, 0.0);
}

@compute @workgroup_size(64)
fn cs_main(@builtin(global_invocation_id) id: vec3u) {
  let index = id.x;
  if (index >= field.count) { return; }
  let grain = grains[index];
  let kind = grain.reference.w;
  var shaded: Shaded;
  if (kind == KIND_OCEAN) {
    shaded = shadeOcean(grain);
  } else if (kind == KIND_SKY) {
    shaded = shadeSky(grain);
  } else if (kind == KIND_SUN) {
    shaded = shadeSun(grain);
  } else if (kind == KIND_MOON) {
    shaded = shadeMoon(grain);
  } else {
    shaded = shadeStar(grain);
  }

  // The source demo's motion: each grain lives about a second. It is born at home, swells, and
  // streams through a field of slow vortices wherever a noise gate is open, so the picture keeps
  // curling away and re-forming. The flow is the curl of the gated potential, which has no
  // divergence: grains born evenly stay evenly spread, so the image swirls without tearing.
  // Distances are in screen heights, so the swirls keep their size on any canvas.
  let seed = grain.attributes.x;
  var current = state[index];
  var life = current.w + field.delta * 0.9 * mix(0.85, 1.15, hash(seed, 1u));
  var offset = current.xy;
  if (life >= 1.0) {
    life = fract(life);
    offset = vec2f(0.0);
  }
  // One field for the whole scene, so whatever leaves a patch of sky or sea is replaced by
  // whatever flows in behind it.
  let slow = field.time * 0.2;
  // Sea grains are placed from their rest point, the rest from where they are drawn.
  let rest = select(shaded.position - field.camera, grain.reference.xyz - vec3f(0.0, field.eyeHeight, 0.0), kind == KIND_OCEAN);
  let home = screen(rest);
  let pace = field.delta * shaded.activity * field.flowStrength;
  // A midpoint step: a plain Euler step lands outside every circle it follows, so grains would
  // spiral out of each vortex and leave its eye empty.
  let midpoint = offset + velocity(home + offset, slow) * pace * 0.5;
  offset += velocity(home + midpoint, slow) * pace;
  state[index] = vec4f(offset, 0.0, life);

  let toward = shaded.position - field.camera;
  let reach = length(toward);
  let ahead = toward / reach;
  let right = normalize(cross(ahead, vec3f(0.0, 1.0, 0.0)));
  let up = cross(right, ahead);
  let moved = shaded.position + (right * offset.x + up * offset.y) * reach * 2.0 * field.halfTan;
  // Grains swell over half their life and fade over the last quarter, close to the original's
  // envelope but with a short hold, so the surfaces stay fine-grained.
  let grow = min(smoothstep(0.0, 0.45, life), 1.0 - smoothstep(0.75, 1.0, life));
  let size = field.pixelSize * grain.attributes.y * grow * shaded.scale;
  lit[index] = Lit(vec4f(moved, size), vec4f(shaded.color * field.exposure * adaptation(), 1.0));
}
