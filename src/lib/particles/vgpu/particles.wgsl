struct Particle {
  positionSize: vec4f,
  colorSeed: vec4f,
  motion: vec4f,
}
struct Spray { offsetAge: vec4f, velocityLife: vec4f }
struct Scene {
  view: mat4x4f,
  projection: mat4x4f,
  viewport: vec2f,
  time: f32,
  pointScale: f32,
  waveStrength: f32,
  waveFrequency: f32,
  sprayEnabled: f32,
  padding: f32,
}
@group(0) @binding(0) var<storage, read> particles: array<Particle>;
@group(0) @binding(1) var<storage, read> spray: array<Spray>;
@group(0) @binding(2) var<uniform> scene: Scene;

struct Out {
  @builtin(position) position: vec4f,
  @location(0) coord: vec2f,
  @location(1) color: vec3f,
  @location(2) emission: f32,
  @location(3) fogDepth: f32,
}

@vertex fn vs_main(@builtin(vertex_index) v: u32, @builtin(instance_index) i: u32) -> Out {
  let particle = particles[i];
  var p = particle.positionSize.xyz;
  let kind = particle.motion.x;
  let seed = particle.colorSeed.w;
  var emission = 0.0;
  var scale = 1.0;
  if (kind > 0.5 && kind < 2.5) {
    let phase = (p.x * 2.2 + p.z * 3.8) * scene.waveFrequency - scene.time;
    p.y += scene.waveStrength * (sin(phase) + 0.28 * sin(p.x * 5.8 - p.z * 2.1 + scene.time * 1.4));
    p.x += scene.waveStrength * 0.3 * cos(phase);
    if (kind > 1.5) { emission = 0.1 + 0.65 * pow(0.5 + 0.5 * cos(phase), 4.0); }
  } else if (kind > 2.5 && kind < 3.5) {
    emission = 1.2;
  } else if (kind > 3.5 && kind < 4.5) {
    p.x += sin(p.y * 0.8 + scene.time * 0.12) * 0.09;
  }
  if (scene.sprayEnabled > 0.5 && particle.motion.y >= 0.0) {
    let state = spray[u32(particle.motion.y)];
    p += state.offsetAge.xyz;
    let life = state.offsetAge.w / state.velocityLife.w;
    scale = 0.65 + 0.35 * sin(life * 3.14159265);
    emission += 0.45 * sin(life * 3.14159265);
  } else if (seed > 0.93 || kind > 4.5) {
    let life = fract(seed * 19.0 + scene.time * 0.085);
    let envelope = sin(life * 3.14159265);
    let flow = vec3f(sin(p.z * 1.4 + scene.time * 0.3), cos(p.x * 0.9 + scene.time * 0.2), sin(p.y * 1.3 + scene.time * 0.25));
    p += flow * envelope * select(0.16, 0.65, kind > 4.5);
    scale = smoothstep(0.0, 0.12, life) * (1.0 - smoothstep(0.7, 1.0, life));
    if (kind > 4.5) { emission = 0.4 * envelope; }
  }
  let viewPosition = scene.view * vec4f(p, 1.0);
  var clip = scene.projection * viewPosition;
  // WebGPU has no variable point size: each grain is a camera-facing quad.
  var corners = array<vec2f, 6>(vec2f(-1,-1), vec2f(1,-1), vec2f(-1,1), vec2f(-1,1), vec2f(1,-1), vec2f(1,1));
  let corner = corners[v];
  let size = particle.positionSize.w * scene.pointScale * (scene.viewport.y / 600.0)
    * 8.0 / max(1.0, -viewPosition.z) * scale;
  clip.x += corner.x * size / scene.viewport.x * clip.w;
  clip.y += corner.y * size / scene.viewport.y * clip.w;
  var out: Out;
  out.position = clip;
  // Match WebGL point coordinates, whose top edge is -1.
  out.coord = vec2f(corner.x, -corner.y);
  out.color = particle.colorSeed.rgb;
  out.emission = emission;
  out.fogDepth = -viewPosition.z;
  return out;
}

@fragment fn fs_main(in: Out) -> @location(0) vec4f {
  let r2 = dot(in.coord, in.coord);
  if (r2 > 1.0) { discard; }
  let normal = vec3f(in.coord, sqrt(1.0 - r2));
  let diffuse = max(dot(normal, normalize(vec3f(-0.4, 0.7, 1.0))), 0.0);
  let specular = pow(max(dot(normal, normalize(vec3f(-0.2, 0.35, 1.0))), 0.0), 24.0);
  var color = in.color * (0.55 + diffuse * 0.65 + in.emission);
  color += vec3f(0.06, 0.09, 0.12) * specular;
  color *= 1.0 - smoothstep(7.0, 19.0, in.fogDepth) * 0.28;
  return vec4f(color, 1.0);
}
