import { describe, expect, it } from 'vitest';

import formatOrdinal from './formatOrdinal';

describe('formatOrdinal', () => {
  it('turns a zero-based array index into a one-based ordinal', () => {
    /*
     * The whole contract in one assertion. `map` hands over 0 for the first item, and the design
     * draws "01" against it — a helper that returned "00" here would be wrong on every list in the
     * repo and would still look plausible in a diff.
     */
    expect([0, 1, 2, 3].map((index) => formatOrdinal(index))).toEqual(['01', '02', '03', '04']);
  });

  it('is safe to use directly as a map callback', () => {
    /*
     * `map` passes (value, index, array), so a bare `items.map(formatOrdinal)` would hand the
     * *value* to `index` and the index to `minimumDigits`. Pinned because it reads as the obvious
     * shorthand and the three consuming sections should not discover it one at a time.
     */
    expect(['a', 'b', 'c'].map((_item, index) => formatOrdinal(index))).toEqual(['01', '02', '03']);
  });

  it('pads to two digits by default and never truncates past them', () => {
    expect(formatOrdinal(8)).toBe('09');
    expect(formatOrdinal(9)).toBe('10');
    expect(formatOrdinal(98)).toBe('99');
    // A list past 99 widens rather than wrapping to "00" — the pad is a minimum, not a format.
    expect(formatOrdinal(99)).toBe('100');
    expect(formatOrdinal(1233)).toBe('1234');
  });

  it('takes a different pad width', () => {
    expect(formatOrdinal(0, 1)).toBe('1');
    expect(formatOrdinal(0, 3)).toBe('001');
    expect(formatOrdinal(9, 4)).toBe('0010');
  });

  it('treats a pad width below one as one rather than emitting an empty string', () => {
    // `padStart` with a non-positive length is a no-op, so this is really asserting the clamp did
    // something — without it a caller passing 0 would silently get the unpadded number.
    expect(formatOrdinal(0, 0)).toBe('1');
    expect(formatOrdinal(0, -3)).toBe('1');
  });

  it('falls back to the first position for an index that cannot have come from map', () => {
    /*
     * A negative index would render "00" and a non-finite one "NaN" — both number-shaped strings
     * that are not numbers, which is worse on a page than being off by one.
     */
    expect(formatOrdinal(-1)).toBe('01');
    expect(formatOrdinal(-99)).toBe('01');
    expect(formatOrdinal(Number.NaN)).toBe('01');
    expect(formatOrdinal(Number.POSITIVE_INFINITY)).toBe('01');
  });

  it('truncates a fractional index towards zero', () => {
    expect(formatOrdinal(1.9)).toBe('02');
    expect(formatOrdinal(0.4)).toBe('01');
  });

  it('falls back to two digits for a non-finite pad width', () => {
    expect(formatOrdinal(0, Number.NaN)).toBe('01');
  });
});
