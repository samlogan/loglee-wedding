import { describe, expect, it } from 'vitest';

import encodeStega from '@/tools/storybook/encodeStega';

import isContained from './isContained';

describe('isContained', () => {
  it('is true only for "contained"', () => {
    expect(isContained('contained')).toBe(true);
    expect(isContained('full')).toBe(false);
  });

  it('defaults to full width when unset', () => {
    expect(isContained(undefined)).toBe(false);
    expect(isContained(null)).toBe(false);
    expect(isContained('')).toBe(false);
  });

  it('reads through the stega payload a draft carries', () => {
    expect(isContained(encodeStega('contained', "$['width']"))).toBe(true);
  });
});
