struct Lit { position: vec4f, color: vec4f }
struct Camera { view: mat4x4f, projection: mat4x4f, viewport: vec2f }
@group(0) @binding(0) var<storage, read> lit: array<Lit>;
@group(0) @binding(1) var<uniform> camera: Camera;

struct Varyings {
  @builtin(position) position: vec4f,
  @location(0) coord: vec2f,
  @location(1) color: vec3f,
}

@vertex fn vs_main(@builtin(vertex_index) v: u32, @builtin(instance_index) i: u32) -> Varyings {
  let grain = lit[i];
  var out: Varyings;
  // Collapsed grains (between lives, below the horizon) produce no fragments.
  let size = grain.position.w;
  if (size < 0.35) {
    out.position = vec4f(2.0, 2.0, 2.0, 1.0);
    return out;
  }
  var clip = camera.projection * camera.view * vec4f(grain.position.xyz, 1.0);
  // WebGPU has no point size: each grain is a camera-facing quad, `size` pixels across.
  var corners = array<vec2f, 6>(vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1), vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1));
  let corner = corners[v];
  let span = max(size, 1.0);
  clip.x += corner.x * span / camera.viewport.x * clip.w;
  clip.y += corner.y * span / camera.viewport.y * clip.w;
  out.position = clip;
  out.coord = vec2f(corner.x, -corner.y);
  // Sub-pixel grains keep their energy instead of shimmering in and out.
  out.color = grain.color.rgb * min(1.0, size * size);
  return out;
}

// Each grain is a tiny lit bead, as in the source demo.
@fragment fn fs_main(in: Varyings) -> @location(0) vec4f {
  let r2 = dot(in.coord, in.coord);
  if (r2 > 1.0) { discard; }
  let normal = vec3f(in.coord, sqrt(1.0 - r2));
  let diffuse = max(dot(normal, normalize(vec3f(0.5, 0.8, 1.0))), 0.0);
  let specular = pow(max(dot(normal, normalize(vec3f(0.25, 0.4, 1.0))), 1e-6), 32.0);
  let color = in.color * (0.62 + 0.48 * diffuse) + in.color * specular * 0.12;
  return vec4f(color, 1.0);
}
