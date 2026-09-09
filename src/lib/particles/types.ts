export interface ParticleCloud {
  count: number;
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  seeds: Float32Array;
  /** 0: rock, 1: water, 2: reflected light, 3: sun, 4: cloud, 5: spray. */
  motion: Float32Array;
}

export interface ParticleParams {
  waveStrength: number;
  waveFrequency: number;
  speed: number;
  pointSize: number;
}

export const DEFAULT_PARTICLE_PARAMS: ParticleParams = {
  waveStrength: 0.09,
  waveFrequency: 1.0,
  speed: 0.55,
  pointSize: 1.0,
};
