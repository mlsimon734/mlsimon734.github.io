@group(0) @binding(0) var scene: texture_2d<f32>;
@group(0) @binding(1) var bloom: texture_2d<f32>;
@group(0) @binding(2) var linearSampler: sampler;
@group(0) @binding(3) var halo: texture_2d<f32>;

// Same ACES fit and sRGB transfer as Three's OutputPass.
fn displayColor(linear: vec3f) -> vec3f {
  let inputMatrix = mat3x3f(vec3f(0.59719, 0.07600, 0.02840), vec3f(0.35458, 0.90834, 0.13383), vec3f(0.04823, 0.01566, 0.83777));
  let outputMatrix = mat3x3f(vec3f(1.60475, -0.10208, -0.00327), vec3f(-0.53108, 1.10813, -0.07276), vec3f(-0.07367, -0.00605, 1.07602));
  let v = inputMatrix * (linear / 0.6);
  let a = v * (v + 0.0245786) - 0.000090537;
  let b = v * (0.983729 * v + 0.4329510) + 0.238081;
  let c = clamp(outputMatrix * (a / b), vec3f(0.0), vec3f(1.0));
  return select(1.055 * pow(max(c, vec3f(1e-7)), vec3f(1.0 / 2.4)) - 0.055, c * 12.92, c <= vec3f(0.0031308));
}

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let color = textureSampleLevel(scene, linearSampler, uv, 0.0).rgb;
  let glow = textureSampleLevel(bloom, linearSampler, uv, 0.0).rgb;
  let atmosphere = textureSampleLevel(halo, linearSampler, uv, 0.0).rgb;
  var graded = color + glow * 0.42 + atmosphere * 0.5;
  // The source demo's grade: a power-curve contrast, then a little more saturation.
  graded = pow(max(graded, vec3f(1e-7)), vec3f(1.0 / 0.72));
  let luma = dot(graded, vec3f(0.2126, 0.7152, 0.0722));
  graded = max(mix(vec3f(luma), graded, 1.08), vec3f(0.0));
  let edge = length((uv - 0.5) * vec2f(1.0, 0.8));
  graded *= 1.0 - 0.32 * smoothstep(0.3, 0.75, edge);
  // A sub-step of noise keeps the long twilight gradients from banding.
  let noise = fract(sin(dot(uv, vec2f(12.9898, 78.233)) * 43758.5453) + 0.5) - 0.5;
  return vec4f(displayColor(graded) + noise / 255.0, 1.0);
}
