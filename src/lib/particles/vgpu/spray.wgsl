struct Spray { offsetAge: vec4f, velocityLife: vec4f }
struct Step { time: f32, delta: f32, count: u32, padding: f32 }
@group(0) @binding(0) var<storage, read_write> spray: array<Spray>;
@group(0) @binding(1) var<storage, read> anchors: array<vec4f>;
@group(0) @binding(2) var<uniform> step: Step;

@compute @workgroup_size(64)
fn cs_main(@builtin(global_invocation_id) id: vec3u) {
  if (id.x >= step.count) { return; }
  let anchor = anchors[id.x];
  let seed = anchor.w;
  var state = spray[id.x];
  var offset = state.offsetAge.xyz;
  var velocity = state.velocityLife.xyz;
  var age = state.offsetAge.w + step.delta;
  let lifetime = state.velocityLife.w;
  if (age >= lifetime || offset.y < -0.04) {
    age = 0.0;
    offset = vec3f(0.0);
    let crest = 0.5 + 0.5 * sin(anchor.z * 3.4 + sin(anchor.x * 1.7) - step.time);
    velocity = vec3f((seed - 0.5) * 0.22, 0.16 + crest * 0.34, -0.08 + seed * 0.12);
  }
  let p = anchor.xyz + offset;
  // Each invocation owns one particle; no neighbours or readback are needed.
  let flow = vec3f(sin(p.z * 1.4 + step.time * 0.3), 0.0, cos(p.x * 1.2 - step.time * 0.25));
  velocity += (flow * 0.12 - velocity * 0.22 + vec3f(0.0, -0.2, 0.0)) * step.delta;
  offset += velocity * step.delta;
  spray[id.x] = Spray(vec4f(offset, age), vec4f(velocity, lifetime));
}
