import { describe, expect, it } from 'vitest';

import pickSlides, { MAX_SLIDES } from './pickSlides';

const FIFTY = Array.from({ length: 50 }, (_, index) => index);

describe('pickSlides', () => {
  it('shows at most twelve by default', () => {
    expect(MAX_SLIDES).toBe(12);
    expect(pickSlides(FIFTY)).toHaveLength(12);
    expect(pickSlides(FIFTY, undefined, 0.42)).toHaveLength(12);
  });

  it('takes the first ones in published order when there is no seed', () => {
    expect(pickSlides(FIFTY, 12)).toEqual(FIFTY.slice(0, 12));
    expect(pickSlides(FIFTY, 12, null)).toEqual(FIFTY.slice(0, 12));
  });

  it('gives the same pick for the same seed, and a different one for another', () => {
    expect(pickSlides(FIFTY, 12, 0.3)).toEqual(pickSlides(FIFTY, 12, 0.3));
    expect(pickSlides(FIFTY, 12, 0.3)).not.toEqual(pickSlides(FIFTY, 12, 0.7));
  });

  it('never repeats an item, and draws from the whole list', () => {
    const seen = new Set<number>();
    for (let run = 0; run < 40; run += 1) {
      const pick = pickSlides(FIFTY, 12, run / 40);
      expect(new Set(pick).size).toBe(pick.length);
      for (const item of pick) {
        seen.add(item);
      }
    }
    // Forty picks of twelve reach well beyond the first twelve — almost certainly all fifty.
    expect(seen.size).toBeGreaterThan(40);
  });

  it('shows every item, shuffled, when there are fewer than the cap', () => {
    const five = [1, 2, 3, 4, 5];
    const pick = pickSlides(five, 12, 0.5);

    expect(pick).toHaveLength(5);
    expect([...pick].toSorted()).toEqual(five);
  });
});
