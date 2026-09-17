import { describe, expect, it } from 'vitest';

import stringClean from './stringClean';

/**
 * Strips the invisible characters Sanity's Visual Editing embeds in strings (Stega encoding), so a
 * value coming from the CMS can be compared or used as a class key.
 */
describe('stringClean', () => {
  it('returns an empty string for nullish input', () => {
    expect(stringClean(undefined)).toBe('');
    expect(stringClean('')).toBe('');
  });

  it('leaves plain ASCII untouched', () => {
    expect(stringClean('Hero Split')).toBe('Hero Split');
  });

  it('removes zero-width characters, which is what Stega encodes with', () => {
    expect(stringClean('warm​-‌stone')).toBe('warm-stone');
    expect(stringClean('⁠lg﻿')).toBe('lg');
  });

  /**
   * Documents a wider behaviour than the function's own comment claims.
   *
   * The implementation is `replaceAll(/[^ -~]/g, '')` — it keeps printable ASCII and
   * removes *everything* else, not just invisible characters. Accented letters, curly quotes,
   * em-dashes, currency symbols and newlines all go too.
   *
   * That is fine where it is used today (theme and spacing keys, which are ASCII slugs), but it
   * would silently mangle editorial copy. Asserted here so the breadth is visible and a future
   * caller does not discover it in production. **Worth review** — the intent in the comment and the
   * behaviour in the regex do not agree.
   */
  it('also strips any non-ASCII, including legitimate copy characters', () => {
    expect(stringClean('café')).toBe('caf');
    expect(stringClean('rate — today')).toBe('rate  today');
    expect(stringClean('£500')).toBe('500');
    expect(stringClean('line\nbreak')).toBe('linebreak');
  });
});
