import { describe, expect, it } from 'vitest';

import {
  DUET_BACK,
  DUET_CAMERA,
  DUET_CLEARANCE_FLOOR,
  DUET_CLIP_EXTENTS,
  DUET_FRONT,
  DUET_MEASURED_CLEARANCE,
  DUET_MIN_ASPECT,
  DUET_NATURAL_ASPECT,
  DUET_SHADOW,
  DUET_TARGET
} from './duetPlacement';

/**
 * # What these assert, and what they deliberately do not
 *
 * The expensive fact about this scene — the worst-case distance between the two dancing skeletons —
 * cannot be recomputed here. Establishing it means decoding two meshopt-compressed GLBs, walking
 * both rigs across every phase combination of a 6.25s loop and a 10.21s one, and comparing a few
 * million point pairs. That is a couple of seconds and two four-megabyte files, in a project whose
 * `unit` suite is gated on every `/commit` precisely because it runs in well under a second.
 *
 * So the measurement lives in `tools/3d/measure-duet.ts`, which reads the real files and prints the
 * table, and these tests hold the line around it. Two different jobs:
 *
 *   - **the invariants** — relationships that must hold no matter what the files contain, and that
 *     a plausible edit can break. That Sam is behind Lauren, that the brief's two-to-three feet was
 *     honoured, that the shadow plane is actually under both of them.
 *   - **the tripwire** — `DUET_MEASURED_CLEARANCE` is a number copied out of the script's output at
 *     one particular placement. If someone nudges a coordinate, the recorded clearance no longer
 *     describes the shipped scene. The tripwire cannot detect that on its own, so it pins the
 *     placement the measurement was taken at, and says so in the failure message.
 *
 * The thing worth being honest about: a cylinder bound would be the obvious test here, and it would
 * be **wrong**. Lauren sweeps ±0.65m and Sam ±0.665m, so treating each as a cylinder demands
 * 1.315m between the marks — and the shipped placement is 1.21m apart. A test asserting the bound
 * would fail on a scene that has a measured 0.395m of clearance, because the bound assumes both of
 * them reach their furthest point, toward each other, at the same instant. They do not.
 */

/** Ground-plane distance between the two marks. The axis the clearance is actually spent on. */
const markDistance = () =>
  Math.hypot(DUET_BACK.position[0] - DUET_FRONT.position[0], DUET_BACK.position[2] - DUET_FRONT.position[2]);

describe('duet placement', () => {
  it('puts Sam upstage of Lauren', () => {
    // Negative Z is away from the camera. The whole idea of the scene is that the separation is
    // spent on the axis the camera looks down rather than on the one a phone is short of.
    expect(DUET_BACK.position[2]).toBeLessThan(DUET_FRONT.position[2]);
  });

  it('keeps the depth inside the brief’s two-to-three feet', () => {
    const depth = DUET_FRONT.position[2] - DUET_BACK.position[2];
    // 0.61m and 0.91m. The upper bound is the one that matters: past it Sam starts reading as a
    // separate, smaller person in the background rather than as the other half of a pair.
    expect(depth).toBeGreaterThanOrEqual(0.61);
    expect(depth).toBeLessThanOrEqual(0.92);
  });

  it('stands both of them on the floor', () => {
    // Y is the contact-shadow plane. A character lifted off it reads as floating, and the shadow —
    // which is baked from a fixed `far` above the plane — stops tracking the feet.
    expect(DUET_FRONT.position[1]).toBe(0);
    expect(DUET_BACK.position[1]).toBe(0);
  });

  it('turns them toward each other by equal and opposite amounts', () => {
    // Symmetry is what keeps the pair reading as a pair. The signs differ because a negative yaw
    // turns toward +X and Lauren is the one at -X.
    expect(DUET_FRONT.rotationY).toBeCloseTo(-DUET_BACK.rotationY, 10);
    expect(DUET_FRONT.rotationY).toBeLessThan(0);
    // Enough to read as "together", not so much that either of them turns away from the camera.
    expect(Math.abs(DUET_FRONT.rotationY)).toBeLessThan(0.35);
  });

  it('names clips it has measurements for', () => {
    // A clip swapped without re-running `yarn duet:measure` is the single most likely way this
    // scene breaks: the placement stays plausible and the extents it was derived from no longer
    // describe the dance.
    expect(DUET_CLIP_EXTENTS[DUET_FRONT.clip]).toBeDefined();
    expect(DUET_CLIP_EXTENTS[DUET_BACK.clip]).toBeDefined();
  });

  it('pins the placement its clearance was measured at', () => {
    /*
     * The tripwire. See the note at the top of this file — `DUET_MEASURED_CLEARANCE` describes
     * *these* coordinates, and nothing in the type system ties the two together.
     *
     * Compared component-wise with a tolerance rather than by deep equality, because the marks are
     * built by adding the optical recentring to the half-lateral and `-0.4 + 0.1` is
     * `-0.30000000000000004` in binary floating point. A deep-equality tripwire would have to spell
     * that out, and would then fail the moment anyone refactored the arithmetic into a different —
     * equally correct — order.
     */
    const measuredAt = {
      back: { rotationY: 0.15, x: 0.5, z: -0.91 },
      front: { rotationY: -0.15, x: -0.3, z: 0 }
    };

    expect(DUET_FRONT.position[0]).toBeCloseTo(measuredAt.front.x, 6);
    expect(DUET_FRONT.position[2]).toBeCloseTo(measuredAt.front.z, 6);
    expect(DUET_FRONT.rotationY).toBeCloseTo(measuredAt.front.rotationY, 6);
    expect(DUET_BACK.position[0]).toBeCloseTo(measuredAt.back.x, 6);
    expect(DUET_BACK.position[2]).toBeCloseTo(measuredAt.back.z, 6);
    expect(DUET_BACK.rotationY).toBeCloseTo(measuredAt.back.rotationY, 6);
  });

  it('clears the meshes at the tightest moment of both loops', () => {
    // 0.395m bone-to-bone, of which roughly 0.16m is mesh rather than air. Re-run
    // `yarn duet:measure` if this needs changing; do not adjust the constant to match a new
    // placement without it.
    expect(DUET_MEASURED_CLEARANCE).toBeGreaterThan(DUET_CLEARANCE_FLOOR);
  });

  it('separates the marks by more than either dancer’s own reach', () => {
    /*
     * The weak-but-real version of the cylinder bound, and the strongest form of it that is
     * actually true here. Neither dancer alone can cross the gap — so a clash needs *both* of them
     * reaching toward the other simultaneously, which is the case the swept-volume measurement
     * settles and this cannot.
     */
    const distance = markDistance();
    expect(distance).toBeGreaterThan(DUET_CLIP_EXTENTS[DUET_FRONT.clip].lateral);
    expect(distance).toBeGreaterThan(DUET_CLIP_EXTENTS[DUET_BACK.clip].lateral);
  });
});

describe('duet framing', () => {
  it('has a floor below the ratio it is designed at', () => {
    // Wider is safe and taller is not; see the table in `duetPlacement.ts`. If these ever cross,
    // the stylesheet's chosen ratio would be below its own floor.
    expect(DUET_MIN_ASPECT).toBeLessThan(DUET_NATURAL_ASPECT);
  });

  it('frames above the taller dancer’s jump', () => {
    /*
     * The one framing fact that is genuinely derivable without a renderer.
     *
     * three's `fov` is vertical, so the visible world height is `2 · d · tan(fov/2)` at the target
     * and does not depend on the canvas's shape at all. Sam's clip peaks at 2.23m, and the camera
     * looks at 1.05m — so the top of the frame has to clear 1.18m above the target.
     */
    const halfHeight = DUET_CAMERA.position[2] * Math.tan(((DUET_CAMERA.fov / 2) * Math.PI) / 180);
    const peak = Math.max(...Object.values(DUET_CLIP_EXTENTS).map((extent) => extent.peak));

    expect(halfHeight).toBeGreaterThan(peak - DUET_TARGET[1]);
  });

  it('keeps the feet inside the bottom of the frame', () => {
    // The other half of the same sum, and the reason the target is 1.05 rather than the 0.95
    // `ModelViewer` uses: raising it to clear the jump must not push the floor out of shot, because
    // the contact shadow is what grounds the pair.
    const halfHeight = DUET_CAMERA.position[2] * Math.tan(((DUET_CAMERA.fov / 2) * Math.PI) / 180);

    expect(halfHeight).toBeGreaterThan(DUET_TARGET[1]);
  });
});

describe('duet contact shadow', () => {
  it('covers both marks with room for the blur', () => {
    const half = DUET_SHADOW.scale / 2;

    for (const placement of [DUET_FRONT, DUET_BACK]) {
      const reach = DUET_CLIP_EXTENTS[placement.clip].lateral;
      // The plane is centred between the two of them rather than on the origin, so this is the
      // check that the offset did not leave one of them hanging off the back edge.
      expect(Math.abs(placement.position[0] - DUET_SHADOW.position[0]) + reach).toBeLessThan(half);
      expect(Math.abs(placement.position[2] - DUET_SHADOW.position[2]) + reach).toBeLessThan(half);
    }
  });
});
