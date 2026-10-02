@group(0) @binding(0) var scene: texture_2d<f32>;
@group(0) @binding(1) var bloom: texture_2d<f32>;
@group(0) @binding(2) var linearSampler: sampler;
@group(0) @binding(3) var halo: texture_2d<f32>;

// Same ACES fit, exposure and sRGB transfer as Three's OutputPass.
fn displayColor(linear: vec3f) -> vec3f {
  let inputMatrix = mat3x3f(vec3f(0.59719, 0.07600, 0.02840), vec3f(0.35458, 0.90834, 0.13383), vec3f(0.04823, 0.01566, 0.83777));
  let outputMatrix = mat3x3f(vec3f(1.60475, -0.10208, -0.00327), vec3f(-0.53108, 1.10813, -0.07276), vec3f(-0.07367, -0.00605, 1.07602));
  let v = inputMatrix * (linear * (0.9 / 0.6));
  let a = v * (v + 0.0245786) - 0.000090537;
  let b = v * (0.983729 * v + 0.4329510) + 0.238081;
  let c = clamp(outputMatrix * (a / b), vec3f(0.0), vec3f(1.0));
  return select(1.055 * pow(c, vec3f(1.0 / 2.4)) - 0.055, c * 12.92, c <= vec3f(0.0031308));
}
@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let color = textureSampleLevel(scene, linearSampler, uv, 0.0).rgb;
  let glow = textureSampleLevel(bloom, linearSampler, uv, 0.0).rgb;
  let atmosphere = textureSampleLevel(halo, linearSampler, uv, 0.0).rgb;
  return vec4f(displayColor(color + glow * 0.32 + atmosphere * 0.6), 1.0);
}
