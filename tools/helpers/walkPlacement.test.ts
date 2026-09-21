import { describe, expect, it } from 'vitest';

import { WALK_CLIP, WALK_FRAMING, walkPair } from './walkPlacement';

const SAM = { src: '/sam.glb' };
const LAUREN = { src: '/lauren.glb' };

describe('walkPair', () => {
  it('stands two players side by side, at the same depth, first on the left', () => {
    const [left, right] = walkPair([SAM, LAUREN]);

    expect(left.src).toBe('/sam.glb');
    expect(right.src).toBe('/lauren.glb');
    expect(left.position[0]).toBeLessThan(0);
    expect(right.position[0]).toBeGreaterThan(0);
    // Symmetric about the camera's axis, so the pair is centred in the frame.
    expect(left.position[0]).toBeCloseTo(-right.position[0], 10);
    expect(left.position[2]).toBe(right.position[2]);
  });

  it('walks both of them, on the floor, facing the camera', () => {
    for (const placement of walkPair([SAM, LAUREN])) {
      expect(placement.clip).toBe(WALK_CLIP);
      expect(placement.position[1]).toBe(0);
      expect(placement.rotationY).toBe(0);
    }
  });

  it('centres a single player rather than leaving a gap beside them', () => {
    const [only, ...rest] = walkPair([{ src: null }, LAUREN]);

    expect(rest).toHaveLength(0);
    expect(only.src).toBe('/lauren.glb');
    expect(only.position[0]).toBe(0);
  });

  it('places at most two, and nothing for no models', () => {
    expect(walkPair([SAM, LAUREN, { src: '/third.glb' }])).toHaveLength(2);
    expect(walkPair([])).toEqual([]);
  });
});

describe('walk framing', () => {
  it('looks level, straight ahead at its own height', () => {
    // A tilted camera would make the pair lean; the target at the camera's height keeps it level.
    expect(WALK_FRAMING.target[1]).toBe(WALK_FRAMING.camera.position[1]);
    expect(WALK_FRAMING.target[0]).toBe(WALK_FRAMING.camera.position[0]);
  });

  it('keeps the shadow plane at the origin', () => {
    // drei's ContactShadows displaces the shadow when its plane is moved; see DUET_SHADOW.
    expect(WALK_FRAMING.shadow.position).toEqual([0, 0, 0]);
  });
});
