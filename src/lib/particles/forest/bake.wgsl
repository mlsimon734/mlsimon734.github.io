// Run once per layout: light every point from its home and replace its albedo with the result.
// Grains keep this colour wherever the flow carries them, so a swirl reads as the scene coming
// loose rather than as new light.
struct Point { position: vec4f, normal: vec4f, color: vec4f }
struct Light { position: vec4f, color: vec4f }
struct Bake {
  eye: vec3f,
  count: u32,
  /** Moonlight and city glow through the canopy, from above. */
  ambient: vec3f,
  lightCount: u32,
}
@group(0) @binding(0) var<storage, read_write> points: array<Point>;
@group(0) @binding(1) var<storage, read> lights: array<Light>;
@group(0) @binding(2) var<uniform> bake: Bake;

// Materials, as in scene.ts.
const WET = 1.0;
const FOLIAGE = 2.0;
const EMISSIVE = 3.0;
const MOTE = 4.0;
// Motes scatter mostly forward (Henyey–Greenstein), so the ones between you and a bulb glow.
const FORWARD = 0.5;
// Light kinds: 0 shines every way, 1 is a doorway that only shines out toward +z.
const DOORWAY = 1.0;

@compute @workgroup_size(64)
fn cs_main(@builtin(global_invocation_id) id: vec3u) {
  let index = id.x;
  if (index >= bake.count) { return; }
  var point = points[index];
  let material = point.color.w;
  if (material == EMISSIVE) { return; }
  let p = point.position.xyz;
  let n = point.normal.xyz;
  let toEye = normalize(bake.eye - p);
  let leaves = material == FOLIAGE;
  let mote = material == MOTE;
  // Leaves pass light through, so they take it from behind as well as in front.
  var diffuse = bake.ambient * select(0.5 + 0.5 * n.y, 0.7 + 0.3 * n.y, leaves);
  var specular = vec3f(0.0);
  for (var i = 0u; i < bake.lightCount; i++) {
    let source = lights[i];
    let offset = source.position.xyz - p;
    let d2 = dot(offset, offset);
    let l = offset * inverseSqrt(max(d2, 1e-6));
    let soft = source.position.w;
    var strength = source.color.rgb / (d2 + soft * soft);
    if (source.color.w == DOORWAY) { strength *= 2.0 * max(-l.z, 0.0); }
    let facing = dot(n, l);
    if (mote) {
      let g = FORWARD;
      let bend = 1.0 + g * g + 2.0 * g * dot(l, toEye);
      diffuse += strength * (1.0 - g * g) / (bend * sqrt(bend));
      continue;
    }
    diffuse += strength * select(max(facing, 0.0), 0.35 + 0.65 * max(facing, 0.0), leaves);
    // The paving is wet: each light leaves a streak on it toward the eye.
    if (material == WET) {
      let h = normalize(l + toEye);
      let fresnel = 0.04 + 0.96 * pow(1.0 - max(dot(toEye, n), 0.0), 5.0);
      specular += strength * pow(max(dot(n, h), 0.0), 260.0) * 34.0 * fresnel;
    }
  }
  point.color = vec4f(point.color.rgb * diffuse + specular, material);
  points[index] = point;
}
