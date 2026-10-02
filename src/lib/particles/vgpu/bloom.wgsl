struct Blur { direction: vec2f, threshold: f32, padding: f32 }
@group(0) @binding(0) var source: texture_2d<f32>;
@group(0) @binding(1) var linearSampler: sampler;
@group(0) @binding(2) var<uniform> blur: Blur;

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  var color = vec3f(0.0);
  var weight = 0.0;
  for (var i = -8; i <= 8; i++) {
    let w = exp(-f32(i * i) / 24.0);
    let sample = textureSampleLevel(source, linearSampler, uv + blur.direction * f32(i), 0.0).rgb;
    let brightness = dot(sample, vec3f(0.299, 0.587, 0.114));
    let cutoff = select(1.0, smoothstep(1.2, 1.21, brightness), blur.threshold > 0.5);
    color += sample * cutoff * w;
    weight += w;
  }
  return vec4f(color / weight, 1.0);
}
