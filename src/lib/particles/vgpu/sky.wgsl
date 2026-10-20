import {
  PI,
  LUT_W,
  LUT_H,
  LUT_SUN_GROUND,
  LUT_SUN_CLOUD,
  LUT_MOON_GROUND,
  LUT_OCCLUSION,
  CLOUD_ALTITUDE,
  lutDirection,
  cloudDensity,
} from "./common.wgsl";

// Single scattering (Rayleigh, Mie, ozone absorption) through a spherical atmosphere, after
// Nishita et al. 1993 with the coefficients of Hillaire 2020. Rows near the horizon are dense,
// so the sunset band and the twilight arch resolve; the Earth's shadow ends the light paths.
struct Sky {
  sun: vec3f,
  sunIntensity: f32,
  moon: vec3f,
  moonIntensity: f32,
  drift: vec2f,
  time: f32,
  cover: f32,
  haze: f32,
}
@group(0) @binding(0) var<storage, read_write> lut: array<vec4f>;
@group(0) @binding(1) var<uniform> sky: Sky;

const EARTH = 6360e3;
const ATMOSPHERE = 6420e3;
const OBSERVER = 8.0;
const RAYLEIGH = vec3f(5.802e-6, 13.558e-6, 33.1e-6);
const MIE_SCATTERING = 3.996e-6;
const MIE_EXTINCTION = 4.44e-6;
const OZONE = vec3f(0.65e-6, 1.881e-6, 0.085e-6);

fn sphere(origin: vec3f, dir: vec3f, radius: f32) -> vec2f {
  let b = dot(origin, dir);
  let d = b * b - (dot(origin, origin) - radius * radius);
  if (d < 0.0) { return vec2f(-1.0); }
  let s = sqrt(d);
  return vec2f(-b - s, -b + s);
}

fn density(height: f32) -> vec3f {
  return vec3f(
    exp(-height / 8000.0),
    exp(-height / 1200.0),
    max(0.0, 1.0 - abs(height - 25000.0) / 15000.0),
  );
}

fn transmittance(depth: vec3f) -> vec3f {
  return exp(-(RAYLEIGH * depth.x + MIE_EXTINCTION * sky.haze * depth.y + OZONE * depth.z));
}

// Optical depth toward the light; effectively infinite in the Earth's shadow.
fn lightDepth(origin: vec3f, light: vec3f) -> vec3f {
  if (sphere(origin, light, EARTH).x > 0.0) { return vec3f(1e9); }
  let stride = sphere(origin, light, ATMOSPHERE).y / 8.0;
  var depth = vec3f(0.0);
  for (var i = 0; i < 8; i++) {
    let p = origin + light * (f32(i) + 0.5) * stride;
    depth += density(length(p) - EARTH) * stride;
  }
  return depth;
}

fn scatter(dir: vec3f, light: vec3f) -> vec3f {
  let origin = vec3f(0.0, EARTH + OBSERVER, 0.0);
  var end = sphere(origin, dir, ATMOSPHERE).y;
  let ground = sphere(origin, dir, EARTH);
  if (ground.x > 0.0) { end = ground.x; }
  let stride = end / 16.0;
  var view = vec3f(0.0);
  var rayleigh = vec3f(0.0);
  var mie = vec3f(0.0);
  for (var i = 0; i < 16; i++) {
    let p = origin + dir * (f32(i) + 0.5) * stride;
    let d = density(length(p) - EARTH) * stride;
    let lit = transmittance(view + d * 0.5 + lightDepth(p, light));
    view += d;
    rayleigh += lit * d.x;
    mie += lit * d.y;
  }
  let mu = dot(dir, light);
  let g = 0.76;
  let phaseRayleigh = 3.0 / (16.0 * PI) * (1.0 + mu * mu);
  let phaseMie = 3.0 / (8.0 * PI) * ((1.0 - g * g) * (1.0 + mu * mu)) /
    ((2.0 + g * g) * pow(1.0 + g * g - 2.0 * g * mu, 1.5));
  return rayleigh * RAYLEIGH * phaseRayleigh + mie * MIE_SCATTERING * sky.haze * phaseMie;
}

fn sunlight(altitude: f32, light: vec3f) -> vec3f {
  return transmittance(lightDepth(vec3f(0.0, EARTH + altitude, 0.0), light));
}

// Moonlight is sunlight at a far lower level; a cool cast stands in for scotopic vision.
const MOONLIGHT = vec3f(0.78, 0.92, 1.12);

@compute @workgroup_size(64)
fn cs_main(@builtin(global_invocation_id) id: vec3u) {
  let index = id.x;
  if (index < LUT_W * LUT_H) {
    let uv = (vec2f(f32(index % LUT_W), f32(index / LUT_W)) + 0.5) / vec2f(f32(LUT_W), f32(LUT_H));
    let dir = lutDirection(uv);
    var color = scatter(dir, sky.sun) * sky.sunIntensity;
    if (sky.moonIntensity > 0.0) {
      color += scatter(dir, sky.moon) * sky.moonIntensity * MOONLIGHT;
    }
    lut[index] = vec4f(color, 1.0);
  } else if (index == LUT_SUN_GROUND) {
    lut[index] = vec4f(sunlight(OBSERVER, sky.sun), 1.0);
  } else if (index == LUT_SUN_CLOUD) {
    lut[index] = vec4f(sunlight(CLOUD_ALTITUDE, sky.sun), 1.0);
  } else if (index == LUT_MOON_GROUND) {
    lut[index] = vec4f(sunlight(OBSERVER, sky.moon) * MOONLIGHT, 1.0);
  } else if (index == LUT_OCCLUSION) {
    lut[index] = vec4f(
      cloudDensity(sky.sun, sky.drift, sky.time, sky.cover, 5),
      cloudDensity(sky.moon, sky.drift, sky.time, sky.cover, 5),
      0.0,
      0.0,
    );
  }
}
