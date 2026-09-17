import { describe, expect, it } from 'vitest';

import { clamp, lerp, map, seededRandom } from './math';

describe('lerp', () => {
  it('returns the endpoints at 0 and 1', () => {
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
  });

  it('interpolates linearly between them', () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(10, 20, 0.25)).toBe(12.5);
  });

  it('interpolates downwards when the end is below the start', () => {
    expect(lerp(10, 0, 0.5)).toBe(5);
  });

  /*
   * The `allowNegatives` flag is the whole reason this is not a one-line helper: without it the
   * result is floored at zero, which is what a scroll- or scale-driven animation wants, and with it
   * negative values pass through for anything that legitimately goes below zero (an offset, a
   * translate).
   */
  it('floors at zero unless negatives are allowed', () => {
    expect(lerp(-10, -20, 0.5)).toBe(0);
    expect(lerp(-10, -20, 0.5, true)).toBe(-15);
  });
});

describe('map', () => {
  it('re-ranges a value from one span to another', () => {
    expect(map(5, 0, 10, 0, 100)).toBe(50);
    expect(map(0, 0, 10, 20, 30)).toBe(20);
    expect(map(10, 0, 10, 20, 30)).toBe(30);
  });

  it('extrapolates beyond the input range rather than clamping', () => {
    // Worth asserting because the name suggests a bounded mapping. It is not bounded — compose it
    // with `clamp` when the output has to stay inside the target range.
    expect(map(20, 0, 10, 0, 100)).toBe(200);
    expect(map(-5, 0, 10, 0, 100)).toBe(-50);
  });

  it('handles an inverted output range', () => {
    expect(map(0, 0, 10, 100, 0)).toBe(100);
    expect(map(10, 0, 10, 100, 0)).toBe(0);
  });
});

describe('clamp', () => {
  it('passes through a value already inside the range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('clamps to each bound', () => {
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });

  it('returns the bound when the range is a single point', () => {
    expect(clamp(5, 3, 3)).toBe(3);
  });
});

describe('seededRandom', () => {
  it('is repeatable — the same seed gives the same value', () => {
    expect(seededRandom(42)).toBe(seededRandom(42));
    expect(seededRandom(7, 100)).toBe(seededRandom(7, 100));
  });

  /*
   * The regression guard for the bug this file surfaced.
   *
   * The defaults used to read `max = 0, min = 1`, which the guards inside the helper resolved to
   * `max = 1, min = 1` — so `min + rnd * (max - min)` collapsed to `min`, and every seed returned a
   * constant `1`. Nothing called it, so the fault was latent rather than live; this assertion is
   * what found it.
   */
  it('gives different values for different seeds on the default range', () => {
    const values = [1, 2, 3, 4, 5].map((seed) => seededRandom(seed));
    expect(new Set(values).size).toBeGreaterThan(1);
  });

  it('stays within the default [0, 1) range', () => {
    for (const seed of [1, 2, 3, 99, 12_345]) {
      const value = seededRandom(seed);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('respects an explicit range', () => {
    for (const seed of [1, 2, 3, 99]) {
      const value = seededRandom(seed, 10, 5);
      expect(value).toBeGreaterThanOrEqual(5);
      expect(value).toBeLessThan(10);
    }
  });
});
