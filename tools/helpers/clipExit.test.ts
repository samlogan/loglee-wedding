import { describe, expect, it } from 'vitest';

import { findClipExit, poseDistance } from './clipExit';
import type { Pose } from './clipExit';

/** A one-bone pose turned `degrees` about Y. */
const turned = (degrees: number): Pose => {
  const half = (degrees * Math.PI) / 360;
  return { Spine: [0, Math.sin(half), 0, Math.cos(half)] };
};

describe('poseDistance', () => {
  it('is zero for the same pose and the angle between two turns otherwise', () => {
    expect(poseDistance(turned(30), turned(30))).toBeCloseTo(0, 6);
    expect(poseDistance(turned(0), turned(40))).toBeCloseTo(40, 6);
  });

  it('treats q and -q as the same rotation', () => {
    const q = turned(25).Spine;
    expect(poseDistance({ Spine: q }, { Spine: [-q[0], -q[1], -q[2], -q[3]] })).toBeCloseTo(0, 6);
  });

  it('compares only the bones both poses have, and is infinite with none in common', () => {
    expect(poseDistance({ ...turned(10), Head: [0, 0, 0, 1] }, turned(10))).toBeCloseTo(0, 6);
    expect(poseDistance({ Head: [0, 0, 0, 1] }, turned(10))).toBe(Number.POSITIVE_INFINITY);
  });
});

describe('findClipExit', () => {
  // The rest loop sweeps 0° → 45° over 1.5s; its pose at time t is t × 30°.
  const rest = { restDuration: 1.55, restSample: (t: number) => turned(t * 30) };

  it('hands over late in the clip where the dance passes closest to the loop, at the matching step', () => {
    // The dance ends far out at 170°, but dips to 45° at 8s — the loop's pose at 1.5s — and nowhere
    // else comes within the loop's range.
    const sample = (t: number) => turned(t < 8 ? 170 - (t / 8) * 125 : 45 + (t - 8) * 62.5);
    const exit = findClipExit({ ...rest, duration: 10, sample, step: 0.05, tolerance: 0.5 });

    expect(exit?.at).toBeCloseTo(8, 1);
    expect(exit?.restAt).toBeCloseTo(1.5, 1);
    expect(exit?.distance).toBeLessThan(2);
  });

  it('plays to the end when the last frame is already the best hand-over', () => {
    // Ends at 20°, inside the loop's range — and so does everything after ~8s, a near-tie the later
    // moment wins.
    const sample = (t: number) => turned(150 - t * 13);
    const exit = findClipExit({ ...rest, duration: 10, sample, step: 0.05 });

    expect(exit?.at).toBe(10);
  });

  it('never ends before the `from` fraction of the clip', () => {
    // The closest moment is at 1s, too early to cut to; the search starts at 60%.
    const sample = (t: number) => turned(t < 2 ? 45 : 170);
    const exit = findClipExit({ ...rest, duration: 10, sample, step: 0.05 });

    expect(exit?.at).toBeGreaterThanOrEqual(6);
  });

  it('returns nothing for an empty clip or an empty loop', () => {
    expect(findClipExit({ ...rest, duration: 0, sample: () => turned(0) })).toBeNull();
    expect(
      findClipExit({ duration: 5, restDuration: 0, restSample: () => turned(0), sample: () => turned(0) })
    ).toBeNull();
  });
});
