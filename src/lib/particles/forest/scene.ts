// A wood at night with a path someone has wired for light, built as points seen from one place.
// Units are metres. The viewer stands on the path at eye height and looks down it, toward −z.

/** Per point: position + size factor, normal + activity, albedo + material. */
export const POINT_FLOATS = 12;
/** Per light: position + softening radius, colour + kind. */
export const LIGHT_FLOATS = 8;

/** How a point takes light; read by bake.wgsl. */
export const MATERIAL = { rough: 0, wet: 1, foliage: 2, emissive: 3, mote: 4 } as const;
type Material = (typeof MATERIAL)[keyof typeof MATERIAL];

export const EYE: readonly [number, number, number] = [0, 1.6, 0];
/** Distance at which grains are sized to cover the frame; nearer they overlap, farther they thin. */
const REFERENCE_DEPTH = 8;
/** Grains per steradian grow with distance as d^DENSITY_POWER; flow.wgsl shrinks them to match. */
const DENSITY_POWER = 0.9;
const DEPTH = 70;
/** Share of grains spent on motes in the air: without them the flow moves through darkness. */
const MOTE_SHARE = 0.008;

export interface View {
  aspect: number;
  /** Vertical field of view, radians. */
  fov: number;
  target: [number, number, number];
}

export interface Layout {
  points: Float32Array<ArrayBuffer>;
  /** Grains per steradian of view at REFERENCE_DEPTH. */
  density: number;
}

export function viewFor(aspect: number): View {
  // 45° tall, as in the source demo, but never narrower than 44° across.
  const fov = Math.max(
    (45 * Math.PI) / 180,
    2 * Math.atan(Math.tan((22 * Math.PI) / 180) / aspect),
  );
  return { aspect, fov, target: [-1.3, 1.3, -26] };
}

/** The path's centre line: it drifts right and back, so its far end sits off the frame's axis. */
export function pathX(z: number): number {
  return 1.1 * Math.sin(-z / 15);
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Vec3 = [number, number, number];

interface Trunk {
  x: number;
  z: number;
  radius: number;
  height: number;
  lean: [number, number];
}

interface Strand {
  from: Vec3;
  to: Vec3;
  sag: number;
}

interface Clump {
  center: Vec3;
  radius: number;
}

const PATH_HALF_WIDTH = 1.05;
const DOOR = { z: -38, width: 1.1, height: 2.2 };
const DOOR_X = pathX(DOOR.z) + 0.2;

let arranged: ReturnType<typeof arrange> | undefined;
/** Everything in the scene, before it becomes points; seeded, so it is worked out once. */
function scene() {
  arranged ??= arrange();
  return arranged;
}

function arrange() {
  const random = mulberry32(11);
  const trunks: Trunk[] = [];
  const clear = (x: number, z: number, gap: number) =>
    Math.abs(x - pathX(z)) > PATH_HALF_WIDTH + 0.6 &&
    !(Math.abs(z - DOOR.z) < 4 && Math.abs(x - DOOR_X) < 3.5) &&
    trunks.every((t) => Math.hypot(t.x - x, t.z - z) > gap + t.radius);
  const plant = (x: number, z: number, radius: number) =>
    trunks.push({
      x,
      z,
      radius,
      height: 13 + random() * 8,
      lean: [(random() - 0.5) * 0.05, (random() - 0.5) * 0.04],
    });

  // Two near trunks frame the view and overlap what lies behind them.
  plant(-1.5, -2.6, 0.42);
  plant(1.95, -4.4, 0.34);
  // The strands hang between these pairs, at intervals that widen with depth.
  const spans = [-7, -15, -26];
  for (const z of spans) {
    plant(pathX(z) - 2 - random() * 0.4, z + (random() - 0.5) * 0.6, 0.27 + random() * 0.08);
    plant(pathX(z) + 2.1 + random() * 0.4, z + (random() - 0.5) * 0.6, 0.25 + random() * 0.08);
  }
  // The rest of the wood: close to the path, then thinning out sideways.
  for (let attempt = 0; attempt < 6000 && trunks.length < 170; attempt++) {
    const z = 1 - random() * DEPTH;
    const side = random() < 0.5 ? -1 : 1;
    const reach = PATH_HALF_WIDTH + 0.7 + Math.pow(random(), 1.7) * 22;
    const x = pathX(z) + side * reach;
    const radius = 0.14 + Math.pow(random(), 2.2) * 0.38;
    if (clear(x, z, 1.5 + reach * 0.1)) plant(x, z, radius);
  }

  const strands: Strand[] = spans.map((_, i) => {
    const left = trunks[2 + i * 2];
    const right = trunks[3 + i * 2];
    return {
      from: [left.x + left.radius, 3.6 + i * 0.3 + random() * 0.2, left.z],
      to: [right.x - right.radius, 3.5 + i * 0.3 + random() * 0.2, right.z],
      sag: 0.5 + random() * 0.25,
    };
  });

  // Leaves gather high around each trunk and lean over the path; a few shrubs sit low.
  const clumps: Clump[] = [];
  for (const trunk of trunks) {
    const count = 3 + Math.floor(random() * 5);
    const inward = Math.sign(pathX(trunk.z) - trunk.x);
    for (let i = 0; i < count; i++) {
      const y = 7 + random() * (trunk.height - 6);
      clumps.push({
        center: [
          trunk.x + inward * random() * 2.2 + (random() - 0.5) * 2,
          y,
          trunk.z + (random() - 0.5) * 2.4,
        ],
        radius: 0.9 + random() * 1.5,
      });
    }
  }
  for (let i = 0; i < 46; i++) {
    const z = -2 - random() * 40;
    const side = random() < 0.5 ? -1 : 1;
    const x = pathX(z) + side * (PATH_HALF_WIDTH + 0.5 + random() * 2.5);
    const radius = 0.35 + random() * 0.5;
    clumps.push({ center: [x, radius * 0.6, z], radius });
  }
  return { trunks, strands, clumps };
}

/** A point on the strand's hanging curve, t from 0 to 1. */
function strandAt(strand: Strand, t: number): Vec3 {
  return [
    strand.from[0] + (strand.to[0] - strand.from[0]) * t,
    strand.from[1] + (strand.to[1] - strand.from[1]) * t - strand.sag * 4 * t * (1 - t),
    strand.from[2] + (strand.to[2] - strand.from[2]) * t,
  ];
}

function bulbsOf(strand: Strand): Vec3[] {
  const span = Math.hypot(strand.to[0] - strand.from[0], strand.to[2] - strand.from[2]);
  const count = Math.max(2, Math.round(span / 0.38));
  return Array.from({ length: count }, (_, i) => {
    const [x, y, z] = strandAt(strand, (i + 0.5) / count);
    return [x, y - 0.06, z];
  });
}

// Linear radiance: cool white bulbs that cast cyan, and a sodium-amber room.
const BULB_GLOW: Vec3 = [3.2, 5.6, 6.4];
const BULB_LIGHT: Vec3 = [0.3, 0.95, 1.4];
const DOOR_GLOW: Vec3 = [10, 4.4, 1.2];
const DOOR_LIGHT: Vec3 = [14, 5.6, 1.3];
// A small lamp over the door, so the wall around it reads as a building rather than fog.
const SCONCE: Vec3 = [DOOR_X, DOOR.height + 0.35, DOOR.z + 0.15];
const SCONCE_GLOW: Vec3 = [4, 2.2, 0.8];
const SCONCE_LIGHT: Vec3 = [0.9, 0.5, 0.18];

/** The lights the bake sums: every bulb, the doorway as a small grid facing up the path, and the
 * lamp over it. */
export function buildLights(): Float32Array<ArrayBuffer> {
  const { strands } = scene();
  const lights: number[] = [];
  for (const strand of strands) {
    for (const bulb of bulbsOf(strand)) lights.push(...bulb, 0.12, ...BULB_LIGHT, 0);
  }
  const rows = 3;
  const columns = 2;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < columns; j++) {
      lights.push(
        DOOR_X + ((j + 0.5) / columns - 0.5) * DOOR.width,
        ((i + 0.5) / rows) * DOOR.height,
        DOOR.z + 0.05,
        0.4,
        ...DOOR_LIGHT.map((c) => c / (rows * columns)),
        1,
      );
    }
  }
  lights.push(...SCONCE, 0.1, ...SCONCE_LIGHT, 0);
  return new Float32Array(lights);
}

/** A piece of surface: its centre and facing decide its share of grains; `sample` places one. */
interface Patch {
  center: Vec3;
  /** Null for leaves, which face every way at once. */
  normal: Vec3 | null;
  area: number;
  material: Material;
  activity: number;
  /** One uniform point on the patch; it overrides the patch's material where that changes inside. */
  sample: (random: () => number) => {
    p: Vec3;
    n: Vec3;
    albedo: Vec3;
    material?: Material;
    activity?: number;
  };
}

/**
 * Lays out up to `count` points. Grains are spread by projected area, biased toward distance
 * (d^DENSITY_POWER per steradian), so the near wood is drawn by fewer, larger grains and the far
 * wood by many fine ones, as in the source demo's reconstruction. Three passes: cut the surfaces
 * into patches, weigh the ones that can be seen, then fill each with its share.
 */
export function buildLayout(count: number, view: View): Layout {
  const random = mulberry32(5);
  const { trunks, strands, clumps } = scene();
  const camera = basis(view);
  const patches: Patch[] = [];
  const add = (patch: Patch) => {
    const v: Vec3 = [patch.center[0] - EYE[0], patch.center[1] - EYE[1], patch.center[2] - EYE[2]];
    const depth = dot(v, camera.forward);
    const reach = Math.max(depth, 0);
    const margin = Math.sqrt(patch.area) + 1.3;
    if (
      depth > -margin &&
      Math.abs(dot(v, camera.right)) < reach * camera.tanX + margin &&
      Math.abs(dot(v, camera.up)) < reach * camera.tanY + margin
    ) {
      patches.push(patch);
    }
  };
  const vary = (base: Vec3, amount: number): Vec3 => {
    const k = 1 + (random() - 0.5) * amount;
    return [base[0] * k, base[1] * k, base[2] * k];
  };

  // The ground: a wet paved path, a concrete kerb along its right edge, leaf litter elsewhere.
  for (let z0 = 2; z0 > -DEPTH; ) {
    const step = Math.min(1.5, 0.12 + Math.abs(z0) * 0.03);
    const zc = z0 - step / 2;
    const reach = Math.abs(zc) * 0.95 + 4;
    for (let x0 = pathX(zc) - reach; x0 < pathX(zc) + reach; x0 += step) {
      const xc = x0 + step / 2;
      const onPath = Math.abs(xc - pathX(zc)) < PATH_HALF_WIDTH;
      const [za, xa] = [z0, x0];
      add({
        center: [xc, 0, zc],
        normal: [0, 1, 0],
        area: step * step,
        material: onPath ? MATERIAL.wet : MATERIAL.rough,
        activity: onPath ? 0.35 : 0.7,
        sample: (r) => {
          const z = za - r() * step;
          const x = xa + r() * step;
          if (Math.abs(x - pathX(z)) < PATH_HALF_WIDTH) {
            return {
              p: [x, 0, z],
              n: [0, 1, 0],
              albedo: vary([0.065, 0.066, 0.064], 0.5),
              material: MATERIAL.wet,
              activity: 0.35,
            };
          }
          const litter = 0.5 + r();
          return {
            p: [x, 0, z],
            n: [0, 1, 0],
            albedo: [0.04 * litter, 0.032 * litter, 0.024 * litter],
            material: MATERIAL.rough,
            activity: 0.7,
          };
        },
      });
    }
    z0 -= step;
  }
  const kerb: Vec3 = [0.22, 0.215, 0.2];
  for (let z0 = 0.5; z0 > DOOR.z + 3; z0 -= 0.4) {
    const za = z0;
    const edge = pathX(z0 - 0.2) + PATH_HALF_WIDTH;
    add({
      center: [edge, 0.08, z0 - 0.2],
      normal: [-1, 0, 0],
      area: 0.4 * 0.16,
      material: MATERIAL.rough,
      activity: 0.3,
      sample: (r) => {
        const z = za - r() * 0.4;
        return {
          p: [pathX(z) + PATH_HALF_WIDTH, r() * 0.16, z],
          n: [-1, 0, 0],
          albedo: vary(kerb, 0.2),
        };
      },
    });
    add({
      center: [edge + 0.1, 0.16, z0 - 0.2],
      normal: [0, 1, 0],
      area: 0.4 * 0.2,
      material: MATERIAL.rough,
      activity: 0.3,
      sample: (r) => {
        const z = za - r() * 0.4;
        return {
          p: [pathX(z) + PATH_HALF_WIDTH + r() * 0.2, 0.16, z],
          n: [0, 1, 0],
          albedo: vary(kerb, 0.2),
        };
      },
    });
  }

  // Trunks, in rings and sectors, with bark ridges in the albedo and a slight lean and taper.
  const SECTORS = 18;
  const RING = 0.25;
  for (const trunk of trunks) {
    const at = (y: number, angle: number): Vec3 => {
      const radius = trunk.radius * (1 - (y / trunk.height) * 0.4);
      return [
        trunk.x + Math.cos(angle) * radius + trunk.lean[0] * y,
        y,
        trunk.z + Math.sin(angle) * radius + trunk.lean[1] * y,
      ];
    };
    for (let y0 = 0; y0 < trunk.height; y0 += RING) {
      const radius = trunk.radius * (1 - (y0 / trunk.height) * 0.4);
      for (let s = 0; s < SECTORS; s++) {
        const angle = ((s + 0.5) / SECTORS) * Math.PI * 2;
        const [ya, sa] = [y0, s];
        add({
          center: at(y0 + RING / 2, angle),
          normal: [Math.cos(angle), 0, Math.sin(angle)],
          area: RING * ((2 * Math.PI * radius) / SECTORS),
          material: MATERIAL.rough,
          activity: 1,
          sample: (r) => {
            const y = ya + r() * RING;
            const a = ((sa + r()) / SECTORS) * Math.PI * 2;
            const ridge = 0.6 + 0.6 * Math.abs(Math.sin(a * 11 + y * 0.9 + trunk.z));
            return {
              p: at(y, a),
              n: [Math.cos(a), 0, Math.sin(a)],
              albedo: [0.075 * ridge, 0.066 * ridge, 0.058 * ridge],
            };
          },
        });
      }
    }
  }

  // Leaves: loose shells of points, each clump split into caps on a spiral.
  const PIECES = 24;
  for (const { center, radius } of clumps) {
    for (let k = 0; k < PIECES; k++) {
      const u = 1 - (2 * (k + 0.5)) / PIECES;
      const angle = k * 2.39996;
      const s = Math.sqrt(1 - u * u);
      add({
        center: [
          center[0] + s * Math.cos(angle) * radius,
          center[1] + u * radius,
          center[2] + s * Math.sin(angle) * radius,
        ],
        normal: null,
        area: (4 * Math.PI * radius * radius) / PIECES,
        material: MATERIAL.foliage,
        activity: 1.2,
        sample: (r) => {
          const cu = Math.min(1, Math.max(-1, u + (r() - 0.5) * (4.4 / PIECES)));
          const ca = angle + (r() - 0.5) * 1.6;
          const cs = Math.sqrt(1 - cu * cu);
          const dir: Vec3 = [cs * Math.cos(ca), cu, cs * Math.sin(ca)];
          const depth = radius * (0.7 + 0.3 * Math.cbrt(r()));
          const shade = 0.55 + 0.9 * r();
          return {
            p: [center[0] + dir[0] * depth, center[1] + dir[1] * depth, center[2] + dir[2] * depth],
            n: dir,
            albedo: [0.03 * shade, 0.045 * shade, 0.036 * shade],
          };
        },
      });
    }
  }

  // The strands: a dark wire and its bulbs. Both hold still while the wood drifts around them.
  for (const strand of strands) {
    const pieces = 24;
    for (let k = 0; k < pieces; k++) {
      add({
        center: strandAt(strand, (k + 0.5) / pieces),
        normal: null,
        area: 0.02 * (4.6 / pieces),
        material: MATERIAL.rough,
        activity: 0,
        sample: (r) => ({
          p: strandAt(strand, (k + r()) / pieces),
          n: [0, 1, 0],
          albedo: [0.02, 0.02, 0.02],
        }),
      });
    }
    for (const bulb of bulbsOf(strand)) {
      add({
        center: bulb,
        normal: null,
        area: 0.012,
        material: MATERIAL.emissive,
        activity: 0,
        sample: (r) => {
          const u = r() * 2 - 1;
          const a = r() * Math.PI * 2;
          const s = Math.sqrt(1 - u * u) * 0.045;
          return {
            p: [bulb[0] + s * Math.cos(a), bulb[1] + u * 0.045, bulb[2] + s * Math.sin(a)],
            n: [0, 1, 0],
            albedo: BULB_GLOW,
          };
        },
      });
    }
  }

  add({
    center: SCONCE,
    normal: null,
    area: 0.01,
    material: MATERIAL.emissive,
    activity: 0,
    sample: (r) => ({
      p: [SCONCE[0] + (r() - 0.5) * 0.1, SCONCE[1] + (r() - 0.5) * 0.05, SCONCE[2]],
      n: [0, 0, 1],
      albedo: SCONCE_GLOW,
    }),
  });

  // The doorway: a low concrete wall at the end of the path, open onto a lit room.
  // Cells a quarter of the door's width, laid from its edges, so none straddles the opening.
  const WALL = { columns: 16, rows: 11, cell: DOOR.width / 4 };
  const wallColor: Vec3 = [0.17, 0.165, 0.155];
  const inDoor = (x: number, y: number) => Math.abs(x - DOOR_X) < DOOR.width / 2 && y < DOOR.height;
  for (let i = 0; i < WALL.columns; i++) {
    for (let j = 0; j < WALL.rows; j++) {
      const xa = DOOR_X + (i - WALL.columns / 2) * WALL.cell;
      const ya = j * WALL.cell;
      const open = inDoor(xa + WALL.cell / 2, ya + WALL.cell / 2);
      add({
        center: [xa + WALL.cell / 2, ya + WALL.cell / 2, open ? DOOR.z - 0.6 : DOOR.z],
        normal: [0, 0, 1],
        area: WALL.cell * WALL.cell,
        material: open ? MATERIAL.emissive : MATERIAL.rough,
        activity: 0,
        sample: (r) => {
          const x = xa + r() * WALL.cell;
          const y = ya + r() * WALL.cell;
          if (!inDoor(x, y)) {
            return {
              p: [x, y, DOOR.z],
              n: [0, 0, 1],
              albedo: vary(wallColor, 0.25),
              material: MATERIAL.rough,
            };
          }
          // The room glows brighter low down, toward a lamp out of sight.
          const k = 0.75 + 0.5 * (1 - y / DOOR.height);
          return {
            p: [x, y, DOOR.z - 0.6],
            n: [0, 0, 1],
            albedo: [DOOR_GLOW[0] * k, DOOR_GLOW[1] * k, DOOR_GLOW[2] * k],
            material: MATERIAL.emissive,
          };
        },
      });
    }
  }

  // Weigh only what can be seen from somewhere in the rig's parallax range, so the far canopy
  // hidden behind the near doesn't take grains it would never show.
  const shown = new Uint8Array(patches.length);
  for (const offset of [-0.65, 0, 0.65])
    reveal(patches, [EYE[0] + offset, EYE[1], EYE[2]], camera, shown);
  const weights = patches.map((patch, k) => {
    if (!shown[k]) return 0;
    const v: Vec3 = [patch.center[0] - EYE[0], patch.center[1] - EYE[1], patch.center[2] - EYE[2]];
    const distance = Math.max(0.5, Math.hypot(v[0], v[1], v[2]));
    const facing = patch.normal ? -dot(patch.normal, v) / distance : 0.5;
    if (facing <= 0.02) return 0;
    // Lights are drawn with finer grains (flow.wgsl), so they take more of them.
    const fine = patch.material === MATERIAL.emissive ? 4 : 1;
    return (
      ((fine * facing * patch.area) / (distance * distance)) *
      Math.pow(distance / REFERENCE_DEPTH, DENSITY_POWER)
    );
  });

  // Fill each patch with its share, leaving room for the motes.
  const motes = Math.round(count * MOTE_SHARE);
  const surfaces = count - motes;
  let total = 0;
  for (const weight of weights) total += weight;
  const density = surfaces / total;
  const points = new Float32Array(count * POINT_FLOATS);
  let written = 0;
  const write = (
    p: Vec3,
    size: number,
    n: Vec3,
    activity: number,
    albedo: Vec3,
    material: number,
  ) => {
    const o = written * POINT_FLOATS;
    points[o] = p[0];
    points[o + 1] = p[1];
    points[o + 2] = p[2];
    points[o + 3] = size;
    points[o + 4] = n[0];
    points[o + 5] = n[1];
    points[o + 6] = n[2];
    points[o + 7] = activity;
    points[o + 8] = albedo[0];
    points[o + 9] = albedo[1];
    points[o + 10] = albedo[2];
    points[o + 11] = material;
    written++;
  };
  // Each patch's fractional share carries into the next, so the total comes out exact.
  let carry = random();
  for (let k = 0; k < patches.length; k++) {
    const patch = patches[k];
    carry += weights[k] * density;
    const n = Math.floor(carry);
    carry -= n;
    for (let i = 0; i < n && written < surfaces; i++) {
      const sample = patch.sample(random);
      const material = sample.material ?? patch.material;
      const activity = material === MATERIAL.emissive ? 0 : (sample.activity ?? patch.activity);
      write(sample.p, 0.7 + random() * 0.6, sample.n, activity, sample.albedo, material);
    }
  }

  // Motes hang in the corridor's air around the lights: a light's share follows its brightness,
  // and spacing them evenly in distance from it gives the 1/d² falloff of the light itself. The
  // dark air between needs none; there they would only be lost against the haze.
  const lights = buildLights();
  const sources: { at: Vec3; doorway: boolean }[] = [];
  const shares: number[] = [];
  for (let o = 0; o < lights.length; o += LIGHT_FLOATS) {
    sources.push({ at: [lights[o], lights[o + 1], lights[o + 2]], doorway: lights[o + 7] === 1 });
    shares.push(0.2126 * lights[o + 4] + 0.7152 * lights[o + 5] + 0.0722 * lights[o + 6]);
  }
  const sum = shares.reduce((a, b) => a + b, 0);
  for (let attempt = 0; attempt < motes * 4 && written < count; attempt++) {
    let pick = random() * sum;
    let i = 0;
    while (i < shares.length - 1 && pick > shares[i]) pick -= shares[i++];
    const { at, doorway } = sources[i];
    const u = random() * 2 - 1;
    const a = random() * Math.PI * 2;
    const r = 0.4 + random() * 4;
    const s = Math.sqrt(1 - u * u);
    // The doorway only lights the air in front of it.
    const dz = doorway ? Math.abs(u) : u;
    const p: Vec3 = [at[0] + r * s * Math.cos(a), at[1] + r * s * Math.sin(a), at[2] + r * dz];
    if (p[1] < 0.1 || Math.abs(p[0] - pathX(p[2])) > 3.5) continue;
    write(p, 0.35 + random() * 0.25, [0, 1, 0], 1.6, [0.03, 0.03, 0.03], MATERIAL.mote);
  }
  // Any shortfall stays zero-sized, and draws nothing.
  return { points, density };
}

type Basis = ReturnType<typeof basis>;

/** The unswayed camera's axes, and its frame widened by a margin for the rig's sway. */
function basis(view: View) {
  const forward = normalize([
    view.target[0] - EYE[0],
    view.target[1] - EYE[1],
    view.target[2] - EYE[2],
  ]);
  const right = normalize(cross(forward, [0, 1, 0]));
  const up = cross(right, forward);
  const tanY = Math.tan(view.fov / 2) * 1.15;
  return { forward, right, up, tanY, tanX: tanY * view.aspect, aspect: view.aspect };
}

/**
 * Marks the patches seen from `eye`: a coarse depth buffer is splatted from everything standing
 * above the ground, then each patch is kept if it lies near the front at its centre. The ground
 * occludes nothing here, since at grazing angles a single cell spans metres of it.
 */
function reveal(patches: Patch[], eye: Vec3, camera: Basis, shown: Uint8Array) {
  const rows = 135;
  const columns = Math.round(rows * camera.aspect);
  const cell = (2 * camera.tanY) / rows;
  const nearest = new Float32Array(rows * columns).fill(Infinity);
  const project = (p: Vec3) => {
    const v: Vec3 = [p[0] - eye[0], p[1] - eye[1], p[2] - eye[2]];
    const depth = dot(v, camera.forward);
    if (depth < 0.3) return null;
    return {
      depth,
      x: (dot(v, camera.right) / depth + camera.tanX) / cell,
      y: (dot(v, camera.up) / depth + camera.tanY) / cell,
      v,
    };
  };
  for (const patch of patches) {
    if (patch.center[1] < 0.05 || patch.area < 0.004) continue;
    const at = project(patch.center);
    if (!at) continue;
    const distance = Math.hypot(at.v[0], at.v[1], at.v[2]);
    const facing = patch.normal ? Math.abs(dot(patch.normal, at.v)) / distance : 1;
    // The patch's footprint in cells, as a disc of the same projected area, a little eroded.
    const radius = (0.45 * Math.sqrt(patch.area * Math.max(facing, 0.05))) / at.depth / cell;
    const x0 = Math.max(0, Math.floor(at.x - radius));
    const x1 = Math.min(columns - 1, Math.floor(at.x + radius));
    const y0 = Math.max(0, Math.floor(at.y - radius));
    const y1 = Math.min(rows - 1, Math.floor(at.y + radius));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - at.x;
        const dy = y + 0.5 - at.y;
        if (dx * dx + dy * dy > radius * radius + 0.5) continue;
        const i = y * columns + x;
        if (at.depth < nearest[i]) nearest[i] = at.depth;
      }
    }
  }
  for (let k = 0; k < patches.length; k++) {
    if (shown[k]) continue;
    const at = project(patches[k].center);
    const x = at ? Math.floor(at.x) : -1;
    const y = at ? Math.floor(at.y) : -1;
    if (!at || x < 0 || y < 0 || x >= columns || y >= rows) {
      shown[k] = 1;
      continue;
    }
    if (at.depth <= nearest[y * columns + x] * 1.06 + 0.25) shown[k] = 1;
  }
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function normalize(v: Vec3): Vec3 {
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
}
