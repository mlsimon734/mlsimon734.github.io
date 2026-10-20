// Shared by the sky and field passes; imported by each at build time.
export const PI = 3.14159265;
export const KIND_SKY = 0.0;
export const KIND_SUN = 1.0;
export const KIND_MOON = 2.0;
const KIND_STAR = 3.0;
export const KIND_OCEAN = 4.0;

// The sky table: relative azimuth across, sqrt(elevation) up, plus four trailing entries.
export const LUT_W = 128u;
export const LUT_H = 64u;
export const LUT_SUN_GROUND = LUT_W * LUT_H; // sun transmittance seen from the pier
export const LUT_SUN_CLOUD = LUT_SUN_GROUND + 1u; // ... and from the cloud layer
export const LUT_MOON_GROUND = LUT_SUN_GROUND + 2u;
export const LUT_OCCLUSION = LUT_SUN_GROUND + 3u; // cloud cover in front of the sun (x) and moon (y)
const LUT_SIZE = LUT_SUN_GROUND + 4u;
export const CLOUD_ALTITUDE = 2000.0;

export fn lutUv(dir: vec3f) -> vec2f {
  // The offset keeps atan2 defined at the zenith, where fast math would return NaN.
  let azimuth = atan2(dir.x, -dir.z - 1e-7);
  let elevation = asin(clamp(dir.y, 0.0, 1.0));
  return vec2f(azimuth / (2.0 * PI) + 0.5, sqrt(elevation / (0.5 * PI)));
}

export fn lutDirection(uv: vec2f) -> vec3f {
  let azimuth = (uv.x - 0.5) * 2.0 * PI;
  let elevation = uv.y * uv.y * 0.5 * PI;
  return vec3f(sin(azimuth) * cos(elevation), sin(elevation), -cos(azimuth) * cos(elevation));
}

fn pcg(v: u32) -> u32 {
  let state = v * 747796405u + 2891336453u;
  let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return (word >> 22u) ^ word;
}

export fn hash(seed: f32, salt: u32) -> f32 {
  return f32(pcg(bitcast<u32>(seed) ^ (salt * 0x9e3779b9u))) / 4294967296.0;
}

// 3D simplex noise (Ashima Arts / Stefan Gustavson, MIT), range about [-1, 1].
fn mod289v3(x: vec3f) -> vec3f { return x - floor(x * (1.0 / 289.0)) * 289.0; }
fn mod289v4(x: vec4f) -> vec4f { return x - floor(x * (1.0 / 289.0)) * 289.0; }
fn permute(x: vec4f) -> vec4f { return mod289v4(((x * 34.0) + 10.0) * x); }

export fn simplex(v: vec3f) -> f32 {
  let C = vec2f(1.0 / 6.0, 1.0 / 3.0);
  var i = floor(v + dot(v, vec3f(C.y)));
  let x0 = v - i + dot(i, vec3f(C.x));
  let g = step(x0.yzx, x0.xyz);
  let l = 1.0 - g;
  let i1 = min(g.xyz, l.zxy);
  let i2 = max(g.xyz, l.zxy);
  let x1 = x0 - i1 + C.x;
  let x2 = x0 - i2 + C.y;
  let x3 = x0 - 0.5;
  i = mod289v3(i);
  let p = permute(permute(permute(
    i.z + vec4f(0.0, i1.z, i2.z, 1.0)) +
    i.y + vec4f(0.0, i1.y, i2.y, 1.0)) +
    i.x + vec4f(0.0, i1.x, i2.x, 1.0));
  let ns = 0.142857142857 * vec3f(2.0, 0.5, 1.0) - vec3f(0.0, 1.0, 0.0);
  let j = p - 49.0 * floor(p * ns.z * ns.z);
  let x_ = floor(j * ns.z);
  let y_ = floor(j - 7.0 * x_);
  let x = x_ * ns.x + ns.yyyy;
  let y = y_ * ns.x + ns.yyyy;
  let h = 1.0 - abs(x) - abs(y);
  let b0 = vec4f(x.xy, y.xy);
  let b1 = vec4f(x.zw, y.zw);
  let s0 = floor(b0) * 2.0 + 1.0;
  let s1 = floor(b1) * 2.0 + 1.0;
  let sh = -step(h, vec4f(0.0));
  let a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  let a1 = b1.xzyw + s1.xzyw * sh.zzww;
  var p0 = vec3f(a0.xy, h.x);
  var p1 = vec3f(a0.zw, h.y);
  var p2 = vec3f(a1.xy, h.z);
  var p3 = vec3f(a1.zw, h.w);
  let norm = 1.79284291400159 - 0.85373472095314 *
    vec4f(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  var m = max(0.5 - vec4f(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), vec4f(0.0));
  m = m * m;
  return 105.0 * dot(m * m, vec4f(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

// The same noise with its analytic gradient (Gustavson's extension): xyz is the gradient, w the
// value. It shares the lattice setup above; only the falloff sum differs.
export fn simplexGrad(v: vec3f) -> vec4f {
  let C = vec2f(1.0 / 6.0, 1.0 / 3.0);
  var i = floor(v + dot(v, vec3f(C.y)));
  let x0 = v - i + dot(i, vec3f(C.x));
  let g = step(x0.yzx, x0.xyz);
  let l = 1.0 - g;
  let i1 = min(g.xyz, l.zxy);
  let i2 = max(g.xyz, l.zxy);
  let x1 = x0 - i1 + C.x;
  let x2 = x0 - i2 + C.y;
  let x3 = x0 - 0.5;
  i = mod289v3(i);
  let p = permute(permute(permute(
    i.z + vec4f(0.0, i1.z, i2.z, 1.0)) +
    i.y + vec4f(0.0, i1.y, i2.y, 1.0)) +
    i.x + vec4f(0.0, i1.x, i2.x, 1.0));
  let ns = 0.142857142857 * vec3f(2.0, 0.5, 1.0) - vec3f(0.0, 1.0, 0.0);
  let j = p - 49.0 * floor(p * ns.z * ns.z);
  let x_ = floor(j * ns.z);
  let y_ = floor(j - 7.0 * x_);
  let x = x_ * ns.x + ns.yyyy;
  let y = y_ * ns.x + ns.yyyy;
  let h = 1.0 - abs(x) - abs(y);
  let b0 = vec4f(x.xy, y.xy);
  let b1 = vec4f(x.zw, y.zw);
  let s0 = floor(b0) * 2.0 + 1.0;
  let s1 = floor(b1) * 2.0 + 1.0;
  let sh = -step(h, vec4f(0.0));
  let a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  let a1 = b1.xzyw + s1.xzyw * sh.zzww;
  var p0 = vec3f(a0.xy, h.x);
  var p1 = vec3f(a0.zw, h.y);
  var p2 = vec3f(a1.xy, h.z);
  var p3 = vec3f(a1.zw, h.w);
  let norm = 1.79284291400159 - 0.85373472095314 *
    vec4f(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  let m = max(0.5 - vec4f(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), vec4f(0.0));
  let m2 = m * m;
  let m4 = m2 * m2;
  let lean = vec4f(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3));
  let t = m2 * m * lean;
  let gradient = -8.0 * (t.x * x0 + t.y * x1 + t.z * x2 + t.w * x3) +
    m4.x * p0 + m4.y * p1 + m4.z * p2 + m4.w * p3;
  return 105.0 * vec4f(gradient, dot(m4, lean));
}

fn fbm(p: vec3f, octaves: i32) -> f32 {
  var sum = 0.0;
  var amplitude = 0.5;
  var q = p;
  for (var i = 0; i < octaves; i++) {
    sum += amplitude * simplex(q);
    q = q * 2.07 + vec3f(17.3, 3.1, 9.7);
    amplitude *= 0.5;
  }
  return sum;
}

// Cloud density where a view ray meets a flat layer, advected by the wind aloft.
// `cover` is the reported cloud fraction; the threshold keeps roughly that share of sky.
export fn cloudDensity(dir: vec3f, drift: vec2f, time: f32, cover: f32, octaves: i32) -> f32 {
  if (cover < 0.005) { return 0.0; }
  let reach = CLOUD_ALTITUDE / max(dir.y, 0.015);
  let ground = dir.xz * reach - drift;
  // Wind-sheared banks: longer along x (across the view) than in depth.
  let n = fbm(vec3f(ground * vec2f(1.0 / 5200.0, 1.0 / 3000.0), time * 0.0035), octaves);
  let bank = smoothstep(-0.42, 0.42, n);
  let threshold = 1.0 - cover;
  // Banks far toward the horizon are smaller than a grain; show their average cover instead of
  // aliased noise.
  return mix(smoothstep(threshold - 0.04, threshold + 0.22, bank), cover, smoothstep(25000.0, 100000.0, reach));
}
