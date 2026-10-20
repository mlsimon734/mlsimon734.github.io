// One invocation per grain, every frame: age it, let the flow carry it, and size it by distance.
struct Point { position: vec4f, normal: vec4f, color: vec4f }
struct Lit { position: vec4f, color: vec4f }
struct Flow {
  camera: vec3f,
  time: f32,
  /** The camera's viewing direction, for perspective sizes. */
  forward: vec3f,
  delta: f32,
  /** Grain diameter in pixels at REFERENCE_DEPTH, before its own size and age. */
  pixelSize: f32,
  /** Typical speed in metres per second where the flow is fully open. */
  strength: f32,
  /** How much of the wood the flow opens: the gate's threshold, −1 (all) to 1 (none). */
  influence: f32,
  count: u32,
}
@group(0) @binding(0) var<storage, read> points: array<Point>;
@group(0) @binding(1) var<storage, read_write> state: array<vec4f>;
@group(0) @binding(2) var<storage, read_write> lit: array<Lit>;
@group(0) @binding(3) var<uniform> flow: Flow;

// REFERENCE_DEPTH as in scene.ts. Grains shrink on screen as d^−SIZE_POWER, a little faster than
// scene.ts thickens them (d^0.9 per steradian), so coverage falls gently with distance.
const REFERENCE_DEPTH = 8.0;
const SIZE_POWER = 0.6;
// Night air, faintly lit by the city: distance fades everything toward a dim blue, so the near
// trunks stand out against the far wood as silhouettes. The renderer clears to the same colour.
const FOG = vec3f(0.03, 0.045, 0.08);
const FOG_DISTANCE = 16.0;
// Swirls a few metres across, slow to change shape.
const FREQUENCY = 0.32;
const EMISSIVE = 3.0;

// The curl of three noise potentials, each drifting its own way so the swirls evolve rather than
// slide. Divergence-free, so the wood thins and gathers without tearing open.
fn curl(p: vec3f, t: f32) -> vec3f {
  let q = p * FREQUENCY;
  let a = simplexGrad(q + vec3f(0.0, t * 0.09, t * 0.05)).xyz;
  let b = simplexGrad(q + vec3f(31.4 - t * 0.06, 7.3, 3.1 + t * 0.08)).xyz;
  let c = simplexGrad(q + vec3f(-12.7, 19.1 - t * 0.07, 5.0 + t * 0.04)).xyz;
  // Noise gradients run about 2 per unit, so this is near unit speed.
  return vec3f(c.y - b.z, a.z - c.x, b.x - a.y) * 0.5;
}

@compute @workgroup_size(64)
fn cs_main(@builtin(global_invocation_id) id: vec3u) {
  let index = id.x;
  if (index >= flow.count) { return; }
  let point = points[index];
  var s = state[index];
  let home = point.position.xyz;
  let activity = point.normal.w;

  // Each grain lives about a second, at its own pace, and is born again at home.
  s.w += flow.delta * 0.9 * mix(0.85, 1.15, hash(f32(index), 3u));
  if (s.w >= 1.0) {
    s.w = fract(s.w);
    s = vec4f(0.0, 0.0, 0.0, s.w);
  }
  // As in the source demo, the gate is read at home: whole regions of the wood come loose
  // together, and the regions wander.
  let t = flow.time;
  let opening = simplex(home * 0.11 + vec3f(t * 0.035, t * 0.02, -t * 0.03));
  let gate = smoothstep(flow.influence, flow.influence + 0.55, opening) * activity;
  if (gate > 0.001 && flow.delta > 0.0) {
    let step = flow.delta * flow.strength * gate;
    let p = home + s.xyz;
    let mid = p + curl(p, t) * step * 0.5;
    s = vec4f(s.xyz + curl(mid, t) * step, s.w);
  }
  state[index] = s;

  let position = home + s.xyz;
  let depth = dot(position - flow.camera, flow.forward);
  var size = 0.0;
  if (depth > 0.1) {
    let age = min(smoothstep(0.0, 0.45, s.w), 1.0 - smoothstep(0.75, 1.0, s.w));
    // Lights hold steady in finer grains (scene.ts gives them more); the rest swells and fades.
    let grow = select(age, 0.5, point.color.w == EMISSIVE);
    size = flow.pixelSize * point.position.w * grow * pow(depth / REFERENCE_DEPTH, -SIZE_POWER);
  }
  // Lights cut through the haze, and their glow in it is the bloom's to draw.
  let fog = select(1.0, 0.4, point.color.w == EMISSIVE);
  let fade = exp(-length(position - flow.camera) * fog / FOG_DISTANCE);
  lit[index] = Lit(vec4f(position, size), vec4f(mix(FOG, point.color.rgb, fade), 1.0));
}
