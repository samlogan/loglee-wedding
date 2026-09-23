import { describe, expect, it } from 'vitest';

import carouselRatios, { MAX_NUDGE, MIN_DIFFERENCE } from './carouselRatios';

const distance = (a: number, b: number) => Math.abs(Math.log(a / b));

/** The share of a photograph `object-fit: cover` crops away to fit a slide of the given shape. */
const cropped = (natural: number, slide: number) => 1 - Math.min(natural / slide, slide / natural);

/** Each slide against the two before it, the strip read as the loop it is. */
const neighboursClear = (ratios: number[]) =>
  ratios.every((ratio, index) =>
    [1, 2].every((back) => {
      if (ratios.length <= back) {
        return true;
      }
      const other = ratios[(index - back + ratios.length) % ratios.length];
      return distance(ratio, other) >= MIN_DIFFERENCE - 1e-9;
    })
  );

/**
 * The home page's 50 photographs as published — crop-adjusted width / height, mostly 3:4 phone
 * shots. The case the carousel was cropping too hard.
 */
const HOME_PHOTOS = [
  0.75, 0.75, 0.75, 0.7238, 1.298, 0.75, 0.75, 0.8231, 1.3333, 0.7498, 0.75, 0.75, 0.75, 0.75, 0.75, 0.75, 0.7498,
  1.5337, 0.75, 1, 0.75, 1, 0.75, 0.75, 0.75, 1, 0.75, 0.75, 1.3333, 0.75, 1, 1.3333, 1, 1.2501, 1, 0.75, 0.7495, 0.75,
  1.2501, 1, 1, 0.75, 0.5658, 1.2371, 0.6669, 0.7676, 0.75, 0.6664, 1, 0.6667
];

describe('carouselRatios', () => {
  it('keeps each photograph exactly its own shape when its neighbours are already different', () => {
    expect(carouselRatios([3 / 4, 3 / 2, 1])).toEqual([3 / 4, 3 / 2, 1]);
    expect(carouselRatios([0.7238, 1.298])).toEqual([0.7238, 1.298]);
  });

  it('nudges a run of photographs shot the same way by just enough, alternating narrower and wider', () => {
    const [first, second, third, fourth] = carouselRatios([3 / 4, 3 / 4, 3 / 4, 3 / 4, 3 / 2, 1]);

    expect(first).toBe(3 / 4);
    // Narrower by the smallest step that clears the first — just over MIN_DIFFERENCE.
    expect(second).toBeLessThan(3 / 4);
    expect(distance(second, 3 / 4)).toBeGreaterThanOrEqual(MIN_DIFFERENCE);
    expect(distance(second, 3 / 4)).toBeLessThan(MIN_DIFFERENCE + 0.01);
    // Then wider, clear of both.
    expect(third).toBeGreaterThan(3 / 4);
    // The fourth is clear of the two before it — which, straddling it, leaves its own shape free.
    expect(fourth).toBe(3 / 4);
  });

  it('finds the small gap between two neighbours that straddle a photograph', () => {
    // The run before it leaves 0.7238 between slides of about 0.706 and 0.796. There is a narrow gap
    // around 0.75 that clears both, a 3.5% nudge; a fixed 8% step would jump past it. Photographs
    // after it keep the loop's seam away from this slide.
    const ratios = carouselRatios([0.75, 0.75, 0.75, 0.7238, 1.5, 1, 1.5, 1]);

    expect(cropped(0.7238, ratios[3])).toBeLessThan(0.04);
  });

  it('never moves a photograph further than MAX_NUDGE', () => {
    const photos = Array.from({ length: 12 }, () => 4 / 3);
    const ratios = carouselRatios(photos);

    for (const [index, ratio] of ratios.entries()) {
      expect(distance(photos[index], ratio)).toBeLessThanOrEqual(MAX_NUDGE + 1e-9);
    }
  });

  it('keeps neighbours different, including across the loop seam', () => {
    for (const length of [2, 3, 4, 5, 6, 7, 12, 18]) {
      expect(neighboursClear(carouselRatios(Array.from({ length }, () => 1)))).toBe(true);
    }
    expect(neighboursClear(carouselRatios(HOME_PHOTOS))).toBe(true);
  });

  it('crops the home page photographs by 8% at most', () => {
    const ratios = carouselRatios(HOME_PHOTOS);
    const crops = ratios.map((ratio, index) => cropped(HOME_PHOTOS[index], ratio));

    expect(Math.max(...crops)).toBeLessThanOrEqual(0.08);
    // Most are not touched at all.
    expect(crops.filter((crop) => crop < 1e-9).length).toBeGreaterThan(HOME_PHOTOS.length / 2);
  });

  it('treats a photograph with no known shape as square', () => {
    const [first, second] = carouselRatios([undefined, 0]);

    expect(first).toBe(1);
    // The second, also square, is nudged just clear of the first.
    expect(distance(second, 1)).toBeGreaterThanOrEqual(MIN_DIFFERENCE);
    expect(distance(second, 1)).toBeLessThan(MIN_DIFFERENCE + 0.01);
  });
});
