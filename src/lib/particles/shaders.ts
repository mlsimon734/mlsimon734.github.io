// Surface particles render into a linear HDR target. OutputPass performs the
// display transform after bloom; depth-tested shaded grains retain their form.
export const PARTICLE_VERT = `#version 300 es
precision highp float;
in vec3 position;
in vec3 particleColor;
in float particleSize;
in float particleSeed;
in float particleMotion;
uniform float uTime;
uniform float uPixelRatio;
uniform float uViewportHeight;
uniform float uPointScale;
uniform float uWaveStrength;
uniform float uWaveFrequency;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
out vec3 vColor;
out float vEmission;
out float vFogDepth;
void main() {
  vec3 p = position;
  float kind = particleMotion;
  float emission = 0.0;
  float scale = 1.0;
  if (kind > 0.5 && kind < 2.5) {
    float phase = (p.x * 2.2 + p.z * 3.8) * uWaveFrequency - uTime;
    p.y += uWaveStrength * (sin(phase) + 0.28 * sin(p.x * 5.8 - p.z * 2.1 + uTime * 1.4));
    p.x += uWaveStrength * 0.3 * cos(phase);
    if (kind > 1.5) emission = 0.1 + 0.65 * pow(0.5 + 0.5 * cos(phase), 4.0);
  } else if (kind > 2.5 && kind < 3.5) {
    emission = 1.2;
  } else if (kind > 3.5 && kind < 4.5) {
    p.x += sin(p.y * 0.8 + uTime * 0.12) * 0.09;
  }
  // A small drifting cohort dissolves and reforms around stable surfaces.
  // Analytic lifetimes need no per-frame CPU upload or simulation textures.
  if (particleSeed > 0.93 || kind > 4.5) {
    float life = fract(particleSeed * 19.0 + uTime * 0.085);
    float envelope = sin(life * 3.14159265);
    vec3 flow = vec3(sin(p.z * 1.4 + uTime * 0.3), cos(p.x * 0.9 + uTime * 0.2), sin(p.y * 1.3 + uTime * 0.25));
    p += flow * envelope * (kind > 4.5 ? 0.65 : 0.16);
    scale = smoothstep(0.0, 0.12, life) * (1.0 - smoothstep(0.7, 1.0, life));
    if (kind > 4.5) emission = 0.4 * envelope;
  }
  vec4 viewPosition = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * viewPosition;
  gl_PointSize = max(0.0, particleSize * uPointScale * uPixelRatio * (uViewportHeight / 600.0)
    * 8.0 / max(1.0, -viewPosition.z) * scale);
  vColor = particleColor;
  vEmission = emission;
  vFogDepth = -viewPosition.z;
}
`;

export const PARTICLE_FRAG = `#version 300 es
precision highp float;
in vec3 vColor;
in float vEmission;
in float vFogDepth;
out vec4 outColor;
void main() {
  vec2 coord = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(coord, coord);
  if (r2 > 1.0) discard;
  vec3 normal = vec3(coord, sqrt(1.0 - r2));
  float diffuse = max(dot(normal, normalize(vec3(-0.4, 0.7, 1.0))), 0.0);
  float specular = pow(max(dot(normal, normalize(vec3(-0.2, 0.35, 1.0))), 0.0), 24.0);
  vec3 color = vColor * (0.55 + diffuse * 0.65 + vEmission);
  color += vec3(0.06, 0.09, 0.12) * specular;
  color *= 1.0 - smoothstep(7.0, 19.0, vFogDepth) * 0.28;
  outColor = vec4(color, 1.0);
}
`;
