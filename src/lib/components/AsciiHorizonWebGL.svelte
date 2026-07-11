<script lang="ts">
  import { onMount } from "svelte";
  import { DESKTOP_CONFIG, MOBILE_CONFIG, type SkyParams, type WaveParams } from "$lib/horizon";
  import { computeWorldParams } from "$lib/horizon/world";
  import {
    createMonoMetrics,
    resolveZonePalette,
    type MonoMetrics,
    type ZonePalette,
  } from "$lib/horizon/render";
  import { createGlyphAtlas, measureCharWidth, parseCssColor } from "$lib/horizon/glyph-atlas";
  import AsciiHorizonDom from "./AsciiHorizonDom.svelte";

  const TARGET_FPS = 24;
  const FRAME_INTERVAL_MS = 1000 / TARGET_FPS;
  const GLYPHS = [
    " ",
    ".",
    ":",
    ";",
    "*",
    "+",
    "░",
    "▒",
    "▓",
    "█",
    "~",
    "-",
    "/",
    "\\",
    "=",
    "_",
    "✦",
    "≈",
    "'",
    ",",
    "·",
    "—",
    "–",
  ];

  const VERTEX_SHADER = `
		attribute vec2 a_position;
		varying vec2 v_uv;

		void main() {
			v_uv = (a_position + 1.0) * 0.5;
			gl_Position = vec4(a_position, 0.0, 1.0);
		}
	`;

  const FRAGMENT_SHADER = `
		precision highp float;

		varying vec2 v_uv;

		uniform vec2 u_grid;
		uniform float u_time;
		uniform float u_sunX;
		uniform float u_sunY;
		uniform float u_sunElevation;
		uniform float u_bodyElevation;
		uniform float u_isNight;
		uniform float u_moonPhase;
		uniform float u_moonIllum;
		uniform float u_horizonGlow;
		uniform float u_starDensity;
		uniform float u_sunRadius;
		uniform float u_swellScale;
		uniform float u_chopScale;
		uniform float u_crestSharpness;
		uniform float u_reflectionSharpness;
		uniform float u_shimmer;
		uniform sampler2D u_glyphAtlas;
		uniform float u_glyphCount;
		uniform vec3 u_colorStar;
		uniform vec3 u_colorSky;
		uniform vec3 u_colorSkyGlow;
		uniform vec3 u_colorSunCore;
		uniform vec3 u_colorSun;
		uniform vec3 u_colorHorizon;
		uniform vec3 u_colorWater;
		uniform vec3 u_colorWaterReflect;
		uniform vec3 u_colorWaterReflectWarm;
		uniform vec3 u_colorWaterReflectCool;
		uniform vec3 u_colorWaterFar;
		uniform vec3 u_colorMoonCore;
		uniform vec3 u_colorMoon;
		uniform vec3 u_bgSkyTop;
		uniform vec3 u_bgSkyLow;
		uniform vec3 u_bgGlow;
		uniform vec3 u_bgMoonGlow;
		uniform vec3 u_bgWaterTop;
		uniform vec3 u_bgWaterDeep;

		const float PI = 3.141592653589793;
		const float TAU = 6.283185307179586;

		float hash(vec2 p) {
			return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
		}

		vec3 zoneColor(float zoneId) {
			if (zoneId < 0.5) return u_colorStar;
			if (zoneId < 1.5) return u_colorSky;
			if (zoneId < 2.5) return u_colorSkyGlow;
			if (zoneId < 3.5) return u_colorSunCore;
			if (zoneId < 4.5) return u_colorSun;
			if (zoneId < 5.5) return u_colorHorizon;
			if (zoneId < 6.5) return u_colorWater;
			if (zoneId < 7.5) return u_colorWaterReflect;
			if (zoneId < 8.5) return u_colorWaterReflectWarm;
			if (zoneId < 9.5) return u_colorWaterReflectCool;
			if (zoneId < 10.5) return u_colorWaterFar;
			if (zoneId < 11.5) return u_colorMoonCore;
			return u_colorMoon;
		}

		// Ordered-dither threshold (approximate 4x4 Bayer) for the quantized
		// background washes.
		float bayer2(vec2 p) {
			p = floor(p);
			return fract(p.x / 2.0 + p.y * p.y * 0.75);
		}

		float bayer4(vec2 p) {
			return bayer2(0.5 * p) * 0.25 + bayer2(p);
		}

		// Quantize t into a few flat bands, dithering the boundary.
		float ditherQuantize(float t, float levels, float threshold) {
			float v = clamp(t, 0.0, 1.0) * (levels - 1.0);
			float base = floor(v);
			float idx = (v - base) > threshold ? base + 1.0 : base;
			return min(idx, levels - 1.0) / (levels - 1.0);
		}

		float glowGradient(float brightness) {
			if (brightness < 0.12) return 0.0;
			if (brightness < 0.25) return 1.0;
			if (brightness < 0.42) return 2.0;
			if (brightness < 0.58) return 3.0;
			return 5.0;
		}

		float skyGradient(float brightness) {
			if (brightness < 0.2) return 0.0;
			if (brightness < 0.32) return 1.0;
			if (brightness < 0.45) return 2.0;
			if (brightness < 0.58) return 3.0;
			return 4.0;
		}

		float tanhApprox(float value) {
			float clamped = clamp(value, -8.0, 8.0);
			float exponent = exp(2.0 * clamped);
			return (exponent - 1.0) / (exponent + 1.0);
		}

		float sunGradient(float brightness) {
			if (brightness < 0.2) return 0.0;
			if (brightness < 0.4) return 6.0;
			if (brightness < 0.62) return 7.0;
			if (brightness < 0.82) return 8.0;
			return 9.0;
		}

		void sampleBand(
			float u,
			float vPerspective,
			float timeSeconds,
			out float sum,
			out float slopeX,
			out float slopeY
		) {
			sum = 0.0;
			slopeX = 0.0;
			slopeY = 0.0;

			float theta = TAU * 1.6 * (cos(radians(82.0)) * u + sin(radians(82.0)) * vPerspective) - 0.42 * timeSeconds + 0.2;
			sum += 1.0 * sin(theta);
			float common = TAU * 1.6 * 1.0 * cos(theta);
			slopeX += common * cos(radians(82.0));
			slopeY += common * sin(radians(82.0));

			theta = TAU * 2.4 * (cos(radians(97.0)) * u + sin(radians(97.0)) * vPerspective) - 0.58 * timeSeconds + 1.3;
			sum += 0.58 * sin(theta);
			common = TAU * 2.4 * 0.58 * cos(theta);
			slopeX += common * cos(radians(97.0));
			slopeY += common * sin(radians(97.0));

			theta = TAU * 3.5 * (cos(radians(70.0)) * u + sin(radians(70.0)) * vPerspective) - 0.74 * timeSeconds + 2.1;
			sum += 0.34 * sin(theta);
			common = TAU * 3.5 * 0.34 * cos(theta);
			slopeX += common * cos(radians(70.0));
			slopeY += common * sin(radians(70.0));
		}

		void sampleChop(
			float u,
			float vPerspective,
			float timeSeconds,
			out float sum,
			out float slopeX,
			out float slopeY
		) {
			sum = 0.0;
			slopeX = 0.0;
			slopeY = 0.0;

			float theta = TAU * 6.5 * (cos(radians(76.0)) * u + sin(radians(76.0)) * vPerspective) - 1.05 * timeSeconds + 0.7;
			sum += 0.20 * sin(theta);
			float common = TAU * 6.5 * 0.20 * cos(theta);
			slopeX += common * cos(radians(76.0));
			slopeY += common * sin(radians(76.0));

			theta = TAU * 9.0 * (cos(radians(104.0)) * u + sin(radians(104.0)) * vPerspective) - 1.22 * timeSeconds + 1.9;
			sum += 0.16 * sin(theta);
			common = TAU * 9.0 * 0.16 * cos(theta);
			slopeX += common * cos(radians(104.0));
			slopeY += common * sin(radians(104.0));

			theta = TAU * 12.5 * (cos(radians(64.0)) * u + sin(radians(64.0)) * vPerspective) - 1.46 * timeSeconds + 2.8;
			sum += 0.11 * sin(theta);
			common = TAU * 12.5 * 0.11 * cos(theta);
			slopeX += common * cos(radians(64.0));
			slopeY += common * sin(radians(64.0));

			theta = TAU * 16.0 * (cos(radians(116.0)) * u + sin(radians(116.0)) * vPerspective) - 1.72 * timeSeconds + 4.0;
			sum += 0.08 * sin(theta);
			common = TAU * 16.0 * 0.08 * cos(theta);
			slopeX += common * cos(radians(116.0));
			slopeY += common * sin(radians(116.0));
		}

		void sampleRipple(
			float u,
			float vRipple,
			float timeSeconds,
			out float sum,
			out float slopeX,
			out float slopeY
		) {
			sum = 0.0;
			slopeX = 0.0;
			slopeY = 0.0;

			float theta = TAU * 21.0 * (cos(radians(84.0)) * u + sin(radians(84.0)) * vRipple) - 2.1 * timeSeconds + 0.4;
			sum += 0.55 * sin(theta);
			float common = TAU * 21.0 * 0.55 * cos(theta);
			slopeX += common * cos(radians(84.0));
			slopeY += common * sin(radians(84.0));

			theta = TAU * 27.0 * (cos(radians(66.0)) * u + sin(radians(66.0)) * vRipple) - 2.7 * timeSeconds + 3.4;
			sum += 0.4 * sin(theta);
			common = TAU * 27.0 * 0.4 * cos(theta);
			slopeX += common * cos(radians(66.0));
			slopeY += common * sin(radians(66.0));

			theta = TAU * 34.0 * (cos(radians(112.0)) * u + sin(radians(112.0)) * vRipple) - 3.2 * timeSeconds + 1.6;
			sum += 0.3 * sin(theta);
			common = TAU * 34.0 * 0.3 * cos(theta);
			slopeX += common * cos(radians(112.0));
			slopeY += common * sin(radians(112.0));
		}

		void sampleOceanSurface(
			float xNorm,
			float waterT,
			out float crest,
			out float slopeX,
			out float slopeY,
			out float glitter
		) {
			float v = clamp(waterT, 0.0, 1.0);
			float vPerspective = 0.18 + 0.82 * pow(v, 1.35);
			float vChop = pow(v, 1.2);
			float vCrest = pow(v, 1.1);
			float vRipple = 0.06 + 0.94 * v;
			float rippleEnvelope = 0.4 + 0.6 * v;
			float swellSum;
			float swellSlopeX;
			float swellSlopeY;
			float chopSum;
			float chopSlopeX;
			float chopSlopeY;
			float rippleSum;
			float rippleSlopeX;
			float rippleSlopeY;

			sampleBand(xNorm, vPerspective, u_time, swellSum, swellSlopeX, swellSlopeY);
			sampleChop(xNorm, vPerspective, u_time, chopSum, chopSlopeX, chopSlopeY);
			sampleRipple(xNorm, vRipple, u_time, rippleSum, rippleSlopeX, rippleSlopeY);

			swellSum /= 1.92;
			chopSum /= 0.55;
			rippleSum /= 1.25;

			float dvPerspective = v <= 0.0 ? 0.0 : 0.82 * 1.35 * pow(v, 0.35);
			float dvChop = v <= 0.0 ? 0.0 : 1.2 * pow(v, 0.2);
			float rippleScale = 1.2 * u_shimmer * rippleEnvelope;
			float heightRaw = u_swellScale * swellSum + u_chopScale * vChop * chopSum;
			float slopeXRaw = u_swellScale * (swellSlopeX / 1.92) + u_chopScale * vChop * (chopSlopeX / 0.55) +
				rippleScale * (rippleSlopeX / 1.25);
			float slopeYRaw = u_swellScale * (swellSlopeY / 1.92) * dvPerspective +
				u_chopScale * ((dvChop * chopSum) + vChop * (chopSlopeY / 0.55) * dvPerspective) +
				rippleScale * (rippleSlopeY / 1.25) * 0.94;

			slopeX = slopeXRaw / max(u_grid.x * 2.0, 1.0);
			slopeY = slopeYRaw / max(u_grid.y * 0.35, 1.0);
			crest = tanhApprox(heightRaw / 14.0 + u_crestSharpness * vCrest * chopSum +
				0.15 * u_shimmer * rippleSum * rippleEnvelope);
			glitter = clamp(0.5 + 0.5 * u_shimmer * rippleSum * rippleEnvelope, 0.0, 1.0);
		}

		float reflectionScore(float xNorm, float waterT, float slopeX, float slopeY) {
			float sigma = 0.016 + (0.085 + 0.035 * (1.0 - clamp((u_bodyElevation + 0.1) / 1.1, 0.0, 1.0))) * pow(waterT, 0.88);
			float dxNorm = xNorm - u_sunX;
			float columnMask = exp(-(dxNorm * dxNorm) / (2.0 * sigma * sigma));
			float verticalFade = exp(-waterT * (0.72 + 0.78 * clamp((u_bodyElevation + 0.15) / 1.15, 0.0, 1.0)));
			float facetAlignment = max(
				0.0,
				1.0 - 1.35 * abs(slopeX) - 0.85 * abs(slopeY - 0.1)
			);
			float specular = pow(facetAlignment, u_reflectionSharpness);
			float glint = 0.12 + 0.88 * specular;
			return columnMask * verticalFade * glint;
		}

		void main() {
			vec2 gridUv = vec2(v_uv.x, 1.0 - v_uv.y);
			vec2 gridPos = gridUv * u_grid;
			vec2 cell = floor(gridPos);
			vec2 local = fract(gridPos);
			float cellX = cell.x + 0.5;
			float cellY = cell.y + 0.5;
			float charHorizon = floor(u_grid.y * 0.65);
			float starTopRows = floor(charHorizon * 0.6);
			float sunCenterCx = floor(u_sunX * u_grid.x + 0.5);
			float sunCenterCy = u_sunY * u_grid.y;
			float sunRadiusX = u_sunRadius * 1.6;
			float sunRadiusY = u_sunRadius;
			float dx = (cellX - sunCenterCx) / sunRadiusX;
			float dy = (cellY - sunCenterCy) / sunRadiusY;
			float dist = sqrt(dx * dx + dy * dy);

			float glyphIndex = 0.0;
			float zoneId = 1.0;
			bool isWater = false;
			vec3 waterColor = vec3(0.0);

			if (cellY < starTopRows && dist > 3.0 && hash(cell) < (0.1 * u_starDensity + 0.005)) {
				zoneId = 0.0;
				glyphIndex = 16.0;
			} else if (cellY < charHorizon) {
				float skyT = cellY / max(charHorizon, 1.0);
				float brightness = mix(0.08, 0.32 + u_sunElevation * 0.18, skyT);

				if (skyT > 0.5) {
					float dxNorm = (cellX / u_grid.x) - u_sunX;
					float lateral = exp(-(dxNorm * dxNorm) / (2.0 * 0.20 * 0.20));
					brightness += u_horizonGlow * 0.35 * ((skyT - 0.5) / 0.5) * lateral;
				}

				if (u_isNight > 0.5 && dist < 1.4) {
					// Moon disc — the phase terminator masks the unlit side
					float nx = dx / 1.4;
					float ny = dy / 1.4;
					float litLimit = cos(TAU * u_moonPhase) * sqrt(max(0.0, 1.0 - ny * ny));
					bool lit = u_moonPhase < 0.5 ? (nx >= litLimit) : (nx <= -litLimit);
					if (dist < 0.7) {
						zoneId = 11.0;
						glyphIndex = lit ? 9.0 : 1.0;
					} else {
						zoneId = 12.0;
						glyphIndex = lit ? sunGradient(clamp(1.0 - (dist - 0.7) / 0.7, 0.0, 1.0)) : 0.0;
					}
				} else if (u_isNight < 0.5 && dist < 0.7) {
					zoneId = 3.0;
					glyphIndex = 9.0;
				} else if (u_isNight < 0.5 && dist < 1.4) {
					zoneId = 4.0;
					glyphIndex = sunGradient(clamp(1.0 - (dist - 0.7) / 0.7, 0.0, 1.0));
				} else if (dist < 2.8 && u_horizonGlow > 0.3) {
					zoneId = 2.0;
					glyphIndex = glowGradient(clamp(brightness, 0.0, 1.0));
				} else {
					float dxNorm = (cellX / u_grid.x) - u_sunX;
					float lateral = exp(-(dxNorm * dxNorm) / (2.0 * 0.3 * 0.3));
					if (skyT > 0.5 && u_horizonGlow > 0.3 && lateral > 0.15) {
						zoneId = 2.0;
						glyphIndex = glowGradient(clamp(brightness, 0.0, 1.0));
					} else {
						zoneId = 1.0;
						glyphIndex = skyGradient(clamp(brightness, 0.0, 1.0));
					}
				}
			} else if (cellY < charHorizon + 2.0) {
				float dxNorm = (cellX / u_grid.x) - u_sunX;
				float proximity = exp(-(dxNorm * dxNorm) / (2.0 * 0.12 * 0.12));
				if (proximity > 0.15 && u_isNight < 0.5) {
					zoneId = 5.0;
					glyphIndex = proximity > 0.55 ? 14.0 : 11.0;
				} else {
					zoneId = u_horizonGlow > 0.2 ? 2.0 : 6.0;
					glyphIndex = 11.0;
				}
			} else {
				float waterT = (cellY - charHorizon) / max(u_grid.y - charHorizon, 1.0);
				float crest;
				float slopeX;
				float slopeY;
				float glitter;
				sampleOceanSurface(cellX / u_grid.x, waterT, crest, slopeX, slopeY, glitter);
				float moonFade = u_isNight > 0.5 ? 0.35 + 0.65 * u_moonIllum : 1.0;
				float reflectScore = reflectionScore(cellX / u_grid.x, waterT, slopeX, slopeY) *
					clamp((u_bodyElevation + 0.75) / 0.85, 0.0, 1.0) * moonFade;

				isWater = true;
				vec3 base = mix(u_colorWater, u_colorWaterFar, smoothstep(0.3, 0.95, waterT));
				base = mix(base, u_colorWaterReflectCool, 0.22 * smoothstep(0.05, 0.6, -crest));
				// Moonglint reads as pale light, never amber
				float warmBand = smoothstep(0.05, 0.3, reflectScore) * (1.0 - u_isNight);
				float hotBand = smoothstep(0.25, 0.6, reflectScore) * (1.0 - u_isNight);
				float coolBand = smoothstep(0.13, 0.4, reflectScore) * u_isNight;
				waterColor = mix(base, u_colorWaterReflectWarm, warmBand);
				waterColor = mix(waterColor, u_colorWaterReflect, hotBand);
				waterColor = mix(waterColor, u_colorWaterReflectCool, coolBand);
				float ambientGlint = step(0.85, glitter) * step(0.12, waterT) * (1.0 - warmBand);
				waterColor = mix(waterColor, u_colorWaterReflectCool, ambientGlint);

				// Per-cell jitter stands in for the CPU renderers' braille dithering;
				// without it whole rows share one glyph and the water bands.
				float jitterA = hash(cell) - 0.5;
				float jitterB = hash(cell + vec2(13.7, 41.3)) - 0.5;
				float crestG = crest + 0.14 * jitterA;
				float glitterG = glitter + 0.1 * jitterB;
				float steepness = abs(slopeX) + 0.05 * jitterB;

				if (glitterG > 0.84 && waterT >= 0.35) {
					glyphIndex = 18.0;
				} else if (waterT < 0.52) {
					if (crestG > 0.45) {
						glyphIndex = 10.0;
					} else if (crestG > 0.1) {
						glyphIndex = 2.0;
					} else if (glitterG > 0.75) {
						glyphIndex = 20.0;
					} else if (crestG > -0.3) {
						glyphIndex = 1.0;
					} else {
						glyphIndex = 19.0;
					}
				} else if (crestG > 0.55) {
					// Slashes only on the very steepest faces — everything gentler
					// stays in the horizontal-flow family.
					if (steepness > 0.46) {
						glyphIndex = slopeX > 0.0 ? 12.0 : 13.0;
					} else {
						glyphIndex = glitterG > 0.5 ? 17.0 : 10.0;
					}
				} else if (crestG > 0.2) {
					if (steepness < 0.13) {
						glyphIndex = 22.0;
					} else {
						glyphIndex = glitterG > 0.55 ? 17.0 : 10.0;
					}
				} else if (crestG < -0.45) {
					glyphIndex = waterT > 0.6 ? 21.0 : 15.0;
				} else if (crestG < -0.12) {
					if (steepness < 0.12) {
						glyphIndex = waterT > 0.55 ? 21.0 : 14.0;
					} else {
						glyphIndex = 1.0;
					}
				} else {
					glyphIndex = steepness > 0.25 ? 2.0 : (glitterG < 0.42 ? 1.0 : 19.0);
				}
			}

			// Painted scene background: quantized, Bayer-dithered sky and water
			// washes computed per character cell so the background sits at the
			// same chunky grid resolution as the glyphs, plus a halo around the
			// sun/moon and a glow wash that follows time of day.
			float bayerTh = bayer4(cell);
			float dxNormBg = (cellX / u_grid.x) - u_sunX;
			float glowStrength = clamp(u_horizonGlow, 0.0, 1.0);
			vec3 haloColor = u_isNight > 0.5 ? u_bgMoonGlow : u_bgGlow;
			float haloStrength = u_isNight > 0.5 ? 0.4 * (0.35 + 0.65 * u_moonIllum) : 0.5;
			// Deep night pulls the dusk band toward the zenith color
			float nightT = u_isNight > 0.5 ? clamp(-u_sunElevation * 1.2 - 0.2, 0.0, 1.0) : 0.0;
			vec3 bgSkyLow = mix(u_bgSkyLow, u_bgSkyTop, 0.65 * nightT);
			vec3 bgWaterTop = mix(u_bgWaterTop, u_bgWaterDeep, 0.5 * nightT);
			float glowMixAmt;
			vec3 bg;
			if (cell.y < charHorizon) {
				float skyTBg = cell.y / max(charHorizon - 1.0, 1.0);
				bg = mix(u_bgSkyTop, bgSkyLow, ditherQuantize(skyTBg, 8.0, bayerTh));
				float lateral = exp(-(dxNormBg * dxNormBg) / (2.0 * 0.32 * 0.32));
				glowMixAmt = 0.85 * glowStrength * lateral * pow(skyTBg, 1.6);
			} else {
				float waterTBg = (cell.y - charHorizon) / max(u_grid.y - 1.0 - charHorizon, 1.0);
				bg = mix(bgWaterTop, u_bgWaterDeep, ditherQuantize(pow(waterTBg, 0.85), 8.0, bayerTh));
				float lateral = exp(-(dxNormBg * dxNormBg) / (2.0 * 0.18 * 0.18));
				glowMixAmt = u_isNight > 0.5
					? 0.22 * u_moonIllum * lateral * (1.0 - waterTBg)
					: 0.4 * glowStrength * lateral * (1.0 - waterTBg);
			}
			// Halo around the sun/moon disc; column offsets scale by the cell
			// aspect so it stays circular in pixel space.
			float haloCol = (cell.x - u_sunX * u_grid.x) * 0.52;
			float haloRow = cell.y - u_sunY * u_grid.y;
			float haloDist = sqrt(haloCol * haloCol + haloRow * haloRow) / 7.5;
			float halo = max(0.0, 1.0 - haloDist);
			glowMixAmt += haloStrength * halo * halo;
			bg = mix(bg, haloColor, ditherQuantize(min(glowMixAmt, 0.9), 7.0, bayerTh));

			vec2 atlasUv = vec2((glyphIndex + local.x) / u_glyphCount, 1.0 - local.y);
			float alpha = texture2D(u_glyphAtlas, atlasUv).a;
			vec3 color = isWater ? waterColor : zoneColor(zoneId);
			gl_FragColor = vec4(mix(bg, color, alpha), 1.0);
		}
	`;

  type UniformMap = Record<string, WebGLUniformLocation | null>;

  interface GlResources {
    gl: WebGLRenderingContext;
    program: WebGLProgram;
    uniforms: UniformMap;
    texture: WebGLTexture;
  }

  let {
    waveParams,
    skyParams,
  }: {
    waveParams: WaveParams;
    skyParams: SkyParams;
  } = $props();

  let canvas: HTMLCanvasElement | undefined = $state();
  let container: HTMLDivElement | undefined = $state();
  let isDesktop = $state(false);
  let reducedMotion = $state(false);
  let inViewport = $state(true);
  let pageVisible = $state(true);
  let supported = $state(true);
  let metrics: MonoMetrics | null = $state(null);
  let palette: ZonePalette | null = $state(null);
  let nowMs = $state(Date.now());

  let glResources: GlResources | null = null;

  const config = $derived(isDesktop ? DESKTOP_CONFIG : MOBILE_CONFIG);
  const world = $derived(computeWorldParams(nowMs, 0, skyParams));
  const shouldAnimate = $derived(!reducedMotion && inViewport && pageVisible);

  async function refreshPresentation() {
    if (!canvas || !container) return;
    await document.fonts.ready;
    if (!canvas || !container) return;

    const nextMetrics = createMonoMetrics(
      config,
      measureCharWidth('11px "JetBrains Mono", ui-monospace, monospace'),
    );
    // Resolve from the container so the theme-scoped .horizon-scene palette applies
    const nextPalette = resolveZonePalette(getComputedStyle(container));

    metrics = nextMetrics;
    palette = nextPalette;
    canvas.style.width = `${nextMetrics.cssWidth}px`;
    canvas.style.height = `${nextMetrics.cssHeight}px`;
  }

  function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
    const shader = gl.createShader(type);
    if (!shader) {
      throw new Error("Unable to create shader");
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader) || "Unknown shader compilation error";
      gl.deleteShader(shader);
      throw new Error(info);
    }

    return shader;
  }

  function initWebGL(): GlResources | null {
    if (!canvas) return null;

    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
    });

    if (!gl) {
      supported = false;
      return null;
    }

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    const program = gl.createProgram();
    if (!program) {
      throw new Error("Unable to create WebGL program");
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || "Unable to link WebGL program");
    }

    gl.useProgram(program);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );

    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const texture = createGlyphAtlas(gl, GLYPHS);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    const uniforms: UniformMap = {
      u_grid: gl.getUniformLocation(program, "u_grid"),
      u_time: gl.getUniformLocation(program, "u_time"),
      u_sunX: gl.getUniformLocation(program, "u_sunX"),
      u_sunY: gl.getUniformLocation(program, "u_sunY"),
      u_sunElevation: gl.getUniformLocation(program, "u_sunElevation"),
      u_bodyElevation: gl.getUniformLocation(program, "u_bodyElevation"),
      u_isNight: gl.getUniformLocation(program, "u_isNight"),
      u_moonPhase: gl.getUniformLocation(program, "u_moonPhase"),
      u_moonIllum: gl.getUniformLocation(program, "u_moonIllum"),
      u_horizonGlow: gl.getUniformLocation(program, "u_horizonGlow"),
      u_starDensity: gl.getUniformLocation(program, "u_starDensity"),
      u_sunRadius: gl.getUniformLocation(program, "u_sunRadius"),
      u_swellScale: gl.getUniformLocation(program, "u_swellScale"),
      u_chopScale: gl.getUniformLocation(program, "u_chopScale"),
      u_crestSharpness: gl.getUniformLocation(program, "u_crestSharpness"),
      u_reflectionSharpness: gl.getUniformLocation(program, "u_reflectionSharpness"),
      u_shimmer: gl.getUniformLocation(program, "u_shimmer"),
      u_glyphAtlas: gl.getUniformLocation(program, "u_glyphAtlas"),
      u_glyphCount: gl.getUniformLocation(program, "u_glyphCount"),
      u_colorStar: gl.getUniformLocation(program, "u_colorStar"),
      u_colorSky: gl.getUniformLocation(program, "u_colorSky"),
      u_colorSkyGlow: gl.getUniformLocation(program, "u_colorSkyGlow"),
      u_colorSunCore: gl.getUniformLocation(program, "u_colorSunCore"),
      u_colorSun: gl.getUniformLocation(program, "u_colorSun"),
      u_colorHorizon: gl.getUniformLocation(program, "u_colorHorizon"),
      u_colorWater: gl.getUniformLocation(program, "u_colorWater"),
      u_colorWaterReflect: gl.getUniformLocation(program, "u_colorWaterReflect"),
      u_colorWaterReflectWarm: gl.getUniformLocation(program, "u_colorWaterReflectWarm"),
      u_colorWaterReflectCool: gl.getUniformLocation(program, "u_colorWaterReflectCool"),
      u_colorWaterFar: gl.getUniformLocation(program, "u_colorWaterFar"),
      u_colorMoonCore: gl.getUniformLocation(program, "u_colorMoonCore"),
      u_colorMoon: gl.getUniformLocation(program, "u_colorMoon"),
      u_bgSkyTop: gl.getUniformLocation(program, "u_bgSkyTop"),
      u_bgSkyLow: gl.getUniformLocation(program, "u_bgSkyLow"),
      u_bgGlow: gl.getUniformLocation(program, "u_bgGlow"),
      u_bgMoonGlow: gl.getUniformLocation(program, "u_bgMoonGlow"),
      u_bgWaterTop: gl.getUniformLocation(program, "u_bgWaterTop"),
      u_bgWaterDeep: gl.getUniformLocation(program, "u_bgWaterDeep"),
    };

    gl.uniform1i(uniforms.u_glyphAtlas, 0);
    gl.uniform1f(uniforms.u_glyphCount, GLYPHS.length);

    return { gl, program, uniforms, texture };
  }

  function renderFrame(timestamp: number) {
    if (!glResources || !metrics || !palette) return;

    const { gl, uniforms } = glResources;
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(metrics.cssWidth * dpr));
    const height = Math.max(1, Math.round(metrics.cssHeight * dpr));

    if (canvas && (canvas.width !== width || canvas.height !== height)) {
      canvas.width = width;
      canvas.height = height;
    }

    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.uniform2f(uniforms.u_grid, config.width, config.height);
    gl.uniform1f(
      uniforms.u_time,
      reducedMotion ? 0 : (timestamp / 1000) * Math.max(waveParams.speed, 0.001),
    );
    gl.uniform1f(uniforms.u_sunX, world.sunX);
    gl.uniform1f(uniforms.u_sunY, world.sunY);
    gl.uniform1f(uniforms.u_sunElevation, world.sunElevation);
    gl.uniform1f(uniforms.u_bodyElevation, world.bodyElevation);
    gl.uniform1f(uniforms.u_isNight, world.isNight ? 1 : 0);
    gl.uniform1f(uniforms.u_moonPhase, world.moonPhase);
    gl.uniform1f(uniforms.u_moonIllum, world.moonIllum);
    gl.uniform1f(uniforms.u_horizonGlow, world.horizonGlow);
    gl.uniform1f(uniforms.u_starDensity, world.starDensity);
    gl.uniform1f(uniforms.u_sunRadius, skyParams.sunRadius);
    gl.uniform1f(uniforms.u_swellScale, waveParams.swellScale);
    gl.uniform1f(uniforms.u_chopScale, waveParams.chopScale);
    gl.uniform1f(uniforms.u_crestSharpness, waveParams.crestSharpness);
    gl.uniform1f(uniforms.u_reflectionSharpness, waveParams.reflectionSharpness);
    gl.uniform1f(uniforms.u_shimmer, waveParams.shimmer ?? 1);

    gl.uniform3fv(uniforms.u_colorStar, parseCssColor(palette.star));
    gl.uniform3fv(uniforms.u_colorSky, parseCssColor(palette.sky));
    gl.uniform3fv(uniforms.u_colorSkyGlow, parseCssColor(palette["sky-glow"]));
    gl.uniform3fv(uniforms.u_colorSunCore, parseCssColor(palette["sun-core"]));
    gl.uniform3fv(uniforms.u_colorSun, parseCssColor(palette.sun));
    gl.uniform3fv(uniforms.u_colorHorizon, parseCssColor(palette.horizon));
    gl.uniform3fv(uniforms.u_colorWater, parseCssColor(palette.water));
    gl.uniform3fv(uniforms.u_colorWaterReflect, parseCssColor(palette["water-reflect"]));
    gl.uniform3fv(uniforms.u_colorWaterReflectWarm, parseCssColor(palette["water-reflect-warm"]));
    gl.uniform3fv(uniforms.u_colorWaterReflectCool, parseCssColor(palette["water-reflect-cool"]));
    gl.uniform3fv(uniforms.u_colorWaterFar, parseCssColor(palette["water-far"]));
    gl.uniform3fv(uniforms.u_colorMoonCore, parseCssColor(palette["moon-core"]));
    gl.uniform3fv(uniforms.u_colorMoon, parseCssColor(palette.moon));
    gl.uniform3fv(uniforms.u_bgSkyTop, parseCssColor(palette["bg-sky-top"]));
    gl.uniform3fv(uniforms.u_bgSkyLow, parseCssColor(palette["bg-sky-low"]));
    gl.uniform3fv(uniforms.u_bgGlow, parseCssColor(palette["bg-glow"]));
    gl.uniform3fv(uniforms.u_bgMoonGlow, parseCssColor(palette["bg-moon-glow"]));
    gl.uniform3fv(uniforms.u_bgWaterTop, parseCssColor(palette["bg-water-top"]));
    gl.uniform3fv(uniforms.u_bgWaterDeep, parseCssColor(palette["bg-water-deep"]));

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  onMount(() => {
    const id = setInterval(() => {
      nowMs = Date.now();
    }, 60_000);

    return () => {
      clearInterval(id);
      if (glResources) {
        glResources.gl.deleteTexture(glResources.texture);
        glResources.gl.deleteProgram(glResources.program);
        glResources = null;
      }
    };
  });

  $effect(() => {
    const mql = window.matchMedia("(min-width: 640px)");
    isDesktop = mql.matches;
    const handler = (e: MediaQueryListEvent) => (isDesktop = e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  });

  $effect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotion = mql.matches;
    const handler = (e: MediaQueryListEvent) => (reducedMotion = e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  });

  $effect(() => {
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        inViewport = entry?.isIntersecting ?? true;
      },
      { rootMargin: "200px 0px" },
    );

    observer.observe(container);
    return () => observer.disconnect();
  });

  $effect(() => {
    pageVisible = document.visibilityState === "visible";
    const handleVisibilityChange = () => {
      pageVisible = document.visibilityState === "visible";
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  });

  $effect(() => {
    let cancelled = false;
    void (async () => {
      await refreshPresentation();
      if (cancelled) return;
    })();

    return () => {
      cancelled = true;
    };
  });

  $effect(() => {
    const observer = new MutationObserver(() => {
      void refreshPresentation();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  });

  $effect(() => {
    if (!canvas || !metrics || !palette) return;
    if (!glResources) {
      glResources = initWebGL();
      if (!glResources) {
        return;
      }
    }

    renderFrame(performance.now());

    if (!shouldAnimate) {
      return;
    }

    let frameId = 0;
    let lastFrame = -FRAME_INTERVAL_MS;

    const tick = (timestamp: number) => {
      if (timestamp - lastFrame >= FRAME_INTERVAL_MS) {
        renderFrame(timestamp);
        lastFrame = timestamp;
      }
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  });
</script>

{#if supported}
  <div bind:this={container} class="canvas-shell">
    <canvas bind:this={canvas} class="render-surface" aria-hidden="true"></canvas>
  </div>
{:else}
  <div class="fallback-note">
    <p>WebGL isn&apos;t available here, so this mode falls back to the DOM renderer.</p>
    <AsciiHorizonDom {waveParams} {skyParams} />
  </div>
{/if}

<style>
  .canvas-shell {
    display: flex;
    justify-content: center;
    overflow: hidden;
  }

  .render-surface {
    display: block;
    max-width: 100%;
    height: auto;
  }

  .fallback-note {
    display: grid;
    gap: 0.75rem;
  }

  .fallback-note p {
    margin: 0;
    font-size: 0.8rem;
    color: var(--color-theme-subtle);
    text-align: center;
  }
</style>
