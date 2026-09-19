import { describe, expect, it } from 'vitest';

import carouselRatios, { CAROUSEL_RATIOS } from './carouselRatios';

const neighboursDiffer = (ratios: number[]) =>
  ratios.every((ratio, index) => ratio !== ratios[(index + 1) % ratios.length]);

describe('carouselRatios', () => {
  it('gives each photograph the closest shape when its neighbours allow it', () => {
    expect(carouselRatios([3 / 4, 3 / 2, 1])).toEqual([3 / 4, 3 / 2, 1]);
    // 1.33 from a 4000×3000 phone photo, 0.56 from a 9:16 screenshot.
    expect(carouselRatios([4000 / 3000, 1080 / 1920])).toEqual([4 / 3, 9 / 16]);
  });

  it('never repeats a shape within two slides, even when every photo was shot the same way', () => {
    const ratios = carouselRatios(Array.from({ length: 9 }, () => 3 / 2));

    for (let index = 0; index < ratios.length; index += 1) {
      expect(ratios[index]).not.toBe(ratios[index + 1]);
      expect(ratios[index]).not.toBe(ratios[index + 2]);
    }
    // Still close to the photographs: the next steps along the ladder, not a portrait.
    expect(Math.min(...ratios)).toBeGreaterThanOrEqual(4 / 3);
    expect(Math.max(...ratios)).toBeLessThanOrEqual(16 / 9);
  });

  it('keeps the loop seam different too — the last slide is followed by the first', () => {
    for (const length of [4, 5, 6, 7, 12, 18]) {
      expect(neighboursDiffer(carouselRatios(Array.from({ length }, () => 1)))).toBe(true);
    }
  });

  it('only ever picks from the ladder', () => {
    for (const ratio of carouselRatios([0.3, 5, 1.1, 0.9, 1.7])) {
      expect(CAROUSEL_RATIOS).toContain(ratio);
    }
  });

  it('treats a photograph with no known shape as square', () => {
    expect(carouselRatios([undefined, 0])).toEqual([1, 4 / 5]);
  });
});
