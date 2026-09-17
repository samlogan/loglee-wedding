/**
 * Re-measure the duet from the GLBs themselves.
 *
 * `yarn duet:measure`
 *
 * Every number in `tools/helpers/duetPlacement.ts` came out of this script. It exists because those
 * numbers are not derivable from anything you can read — they are properties of two Mixamo clips
 * inside two meshopt-compressed binaries — and a comment recording a measurement nobody can repeat
 * is a comment that quietly stops being true.
 *
 * ## What it does
 *
 * Decodes both files, walks each rig across its whole clip, and accumulates the **swept volume** of
 * every bone: where the skeleton has been at any point in the loop, not where it is in its bind
 * pose. Bind-pose geometry is the wrong question entirely — `restpose` has both figures standing
 * still with their arms down, and what the scene needs to know is what they occupy at full
 * extension halfway through a dance.
 *
 * The root's X and Z are pinned to zero as it goes, exactly as `groundClips` does at runtime, so
 * the extents printed are the ones that actually render rather than the ones in the file. That
 * matters more than it sounds: `Crystal_Beads` travels 0.38m in X unpinned.
 *
 * Clearance is then the minimum distance between any bone of one and any bone of the other, across
 * **every phase combination** of the two loops — they are 6.25s and 10.21s and never phase-lock, so
 * over a few minutes on the page all of them occur. A single-phase check would report a comfortable
 * gap for an arrangement whose hands collide once a minute.
 *
 * ## Exit codes
 *
 * `0` the recorded constants still describe the files. `1` they drift, with a `DRIFT:` line naming
 * each one — greppable, and the same convention `generate-fixtures.ts` uses.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { MeshoptDecoder } from 'three-stdlib';

import {
  DUET_BACK,
  DUET_CAMERA,
  DUET_CLIP_EXTENTS,
  DUET_FRONT,
  DUET_MEASURED_CLEARANCE,
  DUET_MIN_ASPECT,
  DUET_NATURAL_ASPECT,
  DUET_TARGET
} from '../helpers/duetPlacement';
import type { DuetPlacement } from '../helpers/duetPlacement';

type Vec3 = [number, number, number];
type Mat4 = number[];

interface Gltf {
  accessors: {
    bufferView: number;
    byteOffset?: number;
    componentType: number;
    count: number;
    normalized?: boolean;
    type: string;
  }[];
  animations?: {
    channels: { sampler: number; target: { node: number; path: string } }[];
    name: string;
    samplers: { input: number; output: number }[];
  }[];
  bufferViews: {
    byteLength: number;
    byteOffset?: number;
    byteStride?: number;
    extensions?: {
      EXT_meshopt_compression?: {
        byteLength: number;
        byteOffset?: number;
        byteStride: number;
        count: number;
        filter?: string;
        mode: string;
      };
    };
  }[];
  nodes: {
    children?: number[];
    matrix?: number[];
    name?: string;
    rotation?: number[];
    scale?: number[];
    translation?: number[];
  }[];
  scene?: number;
  scenes: { nodes: number[] }[];
  skins: { joints: number[] }[];
}

/*=============================================>>>>>
= glTF reading =
===============================================>>>>>*/

const parseGlb = (file: string): { gltf: Gltf; bin: Buffer } => {
  const buffer = readFileSync(file);
  let offset = 12;
  let gltf: Gltf | null = null;
  let bin: Buffer | null = null;

  while (offset < buffer.length) {
    const length = buffer.readUInt32LE(offset);
    /*
     * The chunk type is four ASCII bytes — `JSON` and `BIN\0` — so it is read as text rather than
     * compared against the magic numbers the spec also states them as. Same bytes, and it does not
     * need a comment explaining what `0x4e4f534a` spells.
     */
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    if (type === 'JSON') {
      gltf = JSON.parse(buffer.subarray(offset + 8, offset + 8 + length).toString('utf8')) as Gltf;
    }
    if (type.startsWith('BIN')) {
      bin = Buffer.from(buffer.subarray(offset + 8, offset + 8 + length));
    }
    // Chunks are four-byte aligned; the header does not include the padding.
    offset += 8 + length + ((4 - (length % 4)) % 4);
  }

  if (!(gltf && bin)) {
    throw new Error(`${file} is not a GLB with both a JSON and a BIN chunk`);
  }
  return { bin, gltf };
};

/**
 * Decompress every meshopt buffer view up front.
 *
 * `three-stdlib`'s decoder is the same one drei hands `GLTFLoader` at runtime, which is the point:
 * measuring through a second implementation would leave open the possibility that the numbers here
 * and the geometry on screen disagree.
 */
const decodeViews = (gltf: Gltf, bin: Buffer, decoder: { decodeGltfBuffer: API['decodeGltfBuffer'] }): Buffer[] =>
  gltf.bufferViews.map((view) => {
    const packed = view.extensions?.EXT_meshopt_compression;
    if (!packed) {
      return bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
    }
    const source = new Uint8Array(bin.subarray(packed.byteOffset ?? 0, (packed.byteOffset ?? 0) + packed.byteLength));
    const target = new Uint8Array(packed.count * packed.byteStride);
    decoder.decodeGltfBuffer(target, packed.count, packed.byteStride, source, packed.mode, packed.filter ?? 'NONE');
    return Buffer.from(target.buffer, target.byteOffset, target.byteLength);
  });

const COMPONENTS: Record<string, number> = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
const BYTES: Record<number, number> = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5126: 4 };

const readAccessor = (gltf: Gltf, views: Buffer[], index: number): Float32Array => {
  const accessor = gltf.accessors[index];
  const width = COMPONENTS[accessor.type];
  const view = views[accessor.bufferView];
  const size = BYTES[accessor.componentType];
  const stride = gltf.bufferViews[accessor.bufferView].byteStride ?? size * width;
  const base = accessor.byteOffset ?? 0;
  const out = new Float32Array(accessor.count * width);

  for (let element = 0; element < accessor.count; element++) {
    for (let component = 0; component < width; component++) {
      const at = base + element * stride + component * size;
      let value: number;
      switch (accessor.componentType) {
        case 5126: {
          value = view.readFloatLE(at);
          break;
        }
        case 5122: {
          value = accessor.normalized ? Math.max(view.readInt16LE(at) / 32_767, -1) : view.readInt16LE(at);
          break;
        }
        case 5120: {
          value = accessor.normalized ? Math.max(view.readInt8(at) / 127, -1) : view.readInt8(at);
          break;
        }
        case 5123: {
          value = accessor.normalized ? view.readUInt16LE(at) / 65_535 : view.readUInt16LE(at);
          break;
        }
        default: {
          value = accessor.normalized ? view.readUInt8(at) / 255 : view.readUInt8(at);
        }
      }
      out[element * width + component] = value;
    }
  }
  return out;
};

/*=============================================>>>>>
= Maths =
===============================================>>>>>*/

const IDENTITY: Mat4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

const multiply = (a: Mat4, b: Mat4): Mat4 => {
  const out: number[] = Array.from({ length: 16 }, () => 0);
  for (let column = 0; column < 4; column++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        sum += a[k * 4 + row] * b[column * 4 + k];
      }
      out[column * 4 + row] = sum;
    }
  }
  return out;
};

const compose = (t: number[], q: number[], s: number[]): Mat4 => {
  const [x, y, z, w] = q;
  const [sx, sy, sz] = s;
  const x2 = x + x;
  const y2 = y + y;
  const z2 = z + z;
  const xx = x * x2;
  const xy = x * y2;
  const xz = x * z2;
  const yy = y * y2;
  const yz = y * z2;
  const zz = z * z2;
  const wx = w * x2;
  const wy = w * y2;
  const wz = w * z2;
  return [
    (1 - (yy + zz)) * sx,
    (xy + wz) * sx,
    (xz - wy) * sx,
    0,
    (xy - wz) * sy,
    (1 - (xx + zz)) * sy,
    (yz + wx) * sy,
    0,
    (xz + wy) * sz,
    (yz - wx) * sz,
    (1 - (xx + yy)) * sz,
    0,
    t[0],
    t[1],
    t[2],
    1
  ];
};

/** Linear sample of a keyframe track, renormalising when the track is a quaternion. */
const sampleTrack = (times: Float32Array, values: Float32Array, width: number, at: number): number[] => {
  let i = 0;
  while (i < times.length - 1 && times[i + 1] < at) {
    i++;
  }
  const j = Math.min(i + 1, times.length - 1);
  const span = times[j] - times[i];
  const f = span > 1e-9 ? (at - times[i]) / span : 0;
  const out = Array.from(
    { length: width },
    (_, c) => values[i * width + c] + (values[j * width + c] - values[i * width + c]) * f
  );
  if (width === 4) {
    const length = Math.hypot(...out) || 1;
    for (let c = 0; c < 4; c++) {
      out[c] /= length;
    }
  }
  return out;
};

/*=============================================>>>>>
= The measurement =
===============================================>>>>>*/

interface PoseArgs {
  gltf: Gltf;
  index: number;
  local: Map<number, Record<string, number[]>>;
  parent: Mat4;
  rootBone: number | null;
  world: Map<number, Vec3>;
}

/**
 * Compose one pose, depth first, writing every node's world position into `world`.
 *
 * Declared at module scope rather than inside the frame loop that calls it — `no-loop-func`, and
 * the rule is right here rather than merely satisfied: a closure rebuilt 240 times per character
 * that captures four variables from the enclosing scope is a real (if small) cost, and passing the
 * context explicitly makes it obvious that nothing leaks between frames.
 */
const poseSkeleton = (args: PoseArgs): void => {
  const { gltf, index, local, parent, rootBone, world } = args;
  const node = gltf.nodes[index];
  const animated = local.get(index) ?? {};
  let translation = animated.translation ?? node.translation ?? [0, 0, 0];
  // `groundClips`, in one line: pin the root's X and Z so a travelling clip stays on its mark.
  if (index === rootBone) {
    translation = [0, translation[1], 0];
  }
  const matrix = multiply(
    parent,
    compose(translation, animated.rotation ?? node.rotation ?? [0, 0, 0, 1], animated.scale ?? node.scale ?? [1, 1, 1])
  );
  world.set(index, [matrix[12], matrix[13], matrix[14]]);
  for (const child of node.children ?? []) {
    poseSkeleton({ gltf, index: child, local, parent: matrix, rootBone, world });
  }
};

interface Swept {
  points: Vec3[];
  duration: number;
  lateral: number;
  deep: number;
  peak: number;
}

/**
 * Every bone position this character occupies across one full loop.
 *
 * Two sampling rates, because the two things being measured have opposite cost profiles and the
 * first version of this script got it wrong in a way that showed up as a phantom drift.
 *
 * **Extents** are a linear scan — one forward-kinematics pass per frame, then a `max`. They want to
 * be sampled finely, because an extent is an *apex*: `Gangnam_Groove` jumps, and a coarse grid can
 * step straight over the top of the arc. At 48 frames the peak came out 0.011m low, which is
 * harmless for headroom and wrong as a recorded measurement.
 *
 * **Clearance** is quadratic — every point of one cloud against every point of the other. At 240
 * frames the two clouds are ~21k points each and the alternatives table below would be some
 * billions of distance computations.
 *
 * So the rig is walked at `FRAMES`, extents are taken from every one of those poses, and only every
 * `CLOUD_STRIDE`-th pose contributes points to the cloud the clearance pass uses. `PER_SEGMENT`
 * splits each bone into three so a long forearm does not become two points with half a metre of
 * unexamined space between them.
 */
const FRAMES = 240;
const CLOUD_STRIDE = 5;
const PER_SEGMENT = 3;

const sweep = (file: string, clipName: string, decoder: { decodeGltfBuffer: API['decodeGltfBuffer'] }): Swept => {
  const { bin, gltf } = parseGlb(file);
  const views = decodeViews(gltf, bin, decoder);
  const clip = gltf.animations?.find((animation) => animation.name === clipName);
  if (!clip) {
    throw new Error(
      `${file} has no clip named "${clipName}" (it has: ${gltf.animations?.map((a) => a.name).join(', ')})`
    );
  }

  const channels = clip.channels.map((channel) => {
    const sampler = clip.samplers[channel.sampler];
    return {
      node: channel.target.node,
      path: channel.target.path,
      times: readAccessor(gltf, views, sampler.input),
      values: readAccessor(gltf, views, sampler.output)
    };
  });

  const duration = Math.max(...channels.map((channel) => channel.times[channel.times.length - 1]));
  const root = gltf.scenes[gltf.scene ?? 0].nodes[0];
  const joints = new Set(gltf.skins[0].joints);

  /*
   * The rig's root bone — found by depth-first pre-order, which reaches a node before its children,
   * so the first joint it hits provably has no joint above it. Exactly what `ModelCharacter` does
   * at runtime, and the same limitation applies: a rig with two independent bone roots would ground
   * only the first.
   */
  let rootBone: number | null = null;
  const findRoot = (index: number) => {
    if (rootBone !== null) {
      return;
    }
    if (joints.has(index)) {
      rootBone = index;
      return;
    }
    for (const child of gltf.nodes[index].children ?? []) {
      findRoot(child);
    }
  };
  findRoot(root);

  const points: Vec3[] = [];
  let lateral = 0;
  let deep = 0;
  let peak = 0;

  for (let frame = 0; frame < FRAMES; frame++) {
    const at = (duration * frame) / FRAMES;
    const local = new Map<number, Record<string, number[]>>();
    for (const channel of channels) {
      const width = channel.path === 'rotation' ? 4 : 3;
      const node = local.get(channel.node) ?? {};
      node[channel.path] = sampleTrack(channel.times, channel.values, width, at);
      local.set(channel.node, node);
    }

    const world = new Map<number, Vec3>();
    poseSkeleton({ gltf, index: root, local, parent: IDENTITY, rootBone, world });

    for (const [index, node] of gltf.nodes.entries()) {
      if (!joints.has(index)) {
        continue;
      }
      const a = world.get(index);
      if (!a) {
        continue;
      }
      lateral = Math.max(lateral, Math.abs(a[0]));
      deep = Math.max(deep, Math.abs(a[2]));
      peak = Math.max(peak, a[1]);

      if (frame % CLOUD_STRIDE !== 0) {
        continue;
      }
      points.push(a);

      for (const child of node.children ?? []) {
        if (!joints.has(child)) {
          continue;
        }
        const b = world.get(child);
        if (!b) {
          continue;
        }
        for (let k = 1; k < PER_SEGMENT; k++) {
          const u = k / PER_SEGMENT;
          points.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]);
        }
      }
    }
  }

  return { deep, duration, lateral, peak, points };
};

/** Yaw a swept cloud about the vertical axis, so a turned placement is measured as it renders. */
const turn = (points: Vec3[], yaw: number): Vec3[] => {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return points.map(([x, y, z]): Vec3 => [x * c + z * s, y, -x * s + z * c]);
};

const placed = (swept: Swept, placement: DuetPlacement): Vec3[] =>
  turn(swept.points, placement.rotationY).map(
    ([x, y, z]): Vec3 => [x + placement.position[0], y + placement.position[1], z + placement.position[2]]
  );

/** Minimum bone-to-bone distance between two placed clouds — the whole point of the script. */
const clearance = (a: Vec3[], b: Vec3[]): number => {
  let best = Number.POSITIVE_INFINITY;
  for (const p of a) {
    for (const q of b) {
      const d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2;
      if (d < best) {
        best = d;
      }
    }
  }
  return Math.sqrt(best);
};

/** Horizontal and vertical half-angles of a cloud through the duet camera. */
const halfAngles = (points: Vec3[]): { horizontal: number; vertical: number } => {
  const [, camY, camZ] = DUET_CAMERA.position;
  const forward = [0, DUET_TARGET[1] - camY, -camZ];
  const fl = Math.hypot(...forward);
  const f = forward.map((v) => v / fl);
  const side = [-f[2], 0, f[0]];
  const sl = Math.hypot(...side);
  const s = side.map((v) => v / sl);
  const up = [s[1] * f[2] - s[2] * f[1], s[2] * f[0] - s[0] * f[2], s[0] * f[1] - s[1] * f[0]];

  let horizontal = 0;
  let vertical = 0;
  for (const p of points) {
    const d = [p[0], p[1] - camY, p[2] - camZ];
    const z = d[0] * f[0] + d[1] * f[1] + d[2] * f[2];
    if (z <= 0.01) {
      continue;
    }
    horizontal = Math.max(horizontal, Math.abs((d[0] * s[0] + d[1] * s[1] + d[2] * s[2]) / z));
    vertical = Math.max(vertical, Math.abs((d[0] * up[0] + d[1] * up[1] + d[2] * up[2]) / z));
  }
  return { horizontal, vertical };
};

/*=============================================>>>>>
= Report =
===============================================>>>>>*/

interface API {
  decodeGltfBuffer: (
    target: Uint8Array,
    count: number,
    size: number,
    source: Uint8Array,
    mode: string,
    filter?: string
  ) => void;
  ready: Promise<void>;
}

const publicPath = (src: string) => path.join(process.cwd(), 'public', src.replace(/^\//, ''));

const drift: string[] = [];
const check = (label: string, measured: number, recorded: number, tolerance: number) => {
  const delta = Math.abs(measured - recorded);
  const ok = delta <= tolerance;
  console.log(
    `  ${ok ? 'ok  ' : 'DRIFT'} ${label.padEnd(34)} measured ${measured.toFixed(3)}   recorded ${recorded.toFixed(3)}`
  );
  if (!ok) {
    drift.push(`DRIFT: ${label} — measured ${measured.toFixed(3)}, recorded ${recorded.toFixed(3)}`);
  }
};

const main = async () => {
  const decoder = MeshoptDecoder() as API;
  await decoder.ready;

  const front = sweep(publicPath(DUET_FRONT.src), DUET_FRONT.clip, decoder);
  const back = sweep(publicPath(DUET_BACK.src), DUET_BACK.clip, decoder);

  console.log('\nSwept extents, root pinned as `groundClips` pins it');
  console.log('  clip                 dur      lateral     deep      peak');
  for (const [placement, swept] of [
    [DUET_FRONT, front],
    [DUET_BACK, back]
  ] as const) {
    console.log(
      `  ${placement.clip.padEnd(20)} ${swept.duration.toFixed(2)}s   ±${swept.lateral.toFixed(3)}m   ±${swept.deep.toFixed(3)}m   ${swept.peak.toFixed(3)}m`
    );
  }

  const frontPoints = placed(front, DUET_FRONT);
  const backPoints = placed(back, DUET_BACK);
  const gap = clearance(frontPoints, backPoints);

  console.log('\nClearance at the shipped placement');
  console.log(`  worst-case bone-to-bone gap across every phase combination   ${gap.toFixed(3)}m`);
  console.log(`  less ~0.16m of mesh thickness                                ${(gap - 0.16).toFixed(3)}m of air`);

  console.log('\nAlternatives (lateral × depth, flat-on, no inward turn)');
  console.log('  Sam back →        0.61m     0.76m     0.91m');
  for (const lateral of [0.5, 0.6, 0.7, 0.8, 0.9]) {
    const row = [0.61, 0.76, 0.91]
      .map((depth) => {
        const a = placed(front, { ...DUET_FRONT, position: [-lateral / 2, 0, 0], rotationY: 0 });
        const b = placed(back, { ...DUET_BACK, position: [lateral / 2, 0, -depth], rotationY: 0 });
        return `${clearance(a, b).toFixed(3)}m`.padStart(10);
      })
      .join('');
    console.log(`  lateral ${lateral.toFixed(2)}m ${row}`);
  }

  const { horizontal, vertical } = halfAngles([...frontPoints, ...backPoints]);
  const tan = Math.tan(((DUET_CAMERA.fov / 2) * Math.PI) / 180);

  console.log('\nFraming');
  console.log(
    `  vertical fill                 ${((vertical / tan) * 100).toFixed(1)}%  (fits at any container aspect)`
  );
  console.log(`  minimum container aspect      ${(horizontal / tan).toFixed(3)} : 1`);
  console.log(`  natural aspect                ${(horizontal / vertical).toFixed(3)} : 1`);

  console.log('\nAgainst tools/helpers/duetPlacement.ts');
  check(`${DUET_FRONT.clip} lateral`, front.lateral, DUET_CLIP_EXTENTS[DUET_FRONT.clip].lateral, 0.01);
  check(`${DUET_FRONT.clip} peak`, front.peak, DUET_CLIP_EXTENTS[DUET_FRONT.clip].peak, 0.01);
  check(`${DUET_BACK.clip} lateral`, back.lateral, DUET_CLIP_EXTENTS[DUET_BACK.clip].lateral, 0.01);
  check(`${DUET_BACK.clip} peak`, back.peak, DUET_CLIP_EXTENTS[DUET_BACK.clip].peak, 0.01);
  check('clearance', gap, DUET_MEASURED_CLEARANCE, 0.01);
  check('minimum aspect', horizontal / tan, DUET_MIN_ASPECT, 0.01);
  check('natural aspect', horizontal / vertical, DUET_NATURAL_ASPECT, 0.01);

  if (drift.length > 0) {
    console.log('');
    for (const line of drift) {
      console.log(line);
    }
    console.log('\nUpdate the constants in tools/helpers/duetPlacement.ts, then re-run.');
    process.exitCode = 1;
    return;
  }
  console.log('\nThe recorded geometry still describes the files.\n');
};

try {
  await main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
