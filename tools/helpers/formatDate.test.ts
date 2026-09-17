import { describe, expect, it } from 'vitest';

import formatDate from './formatDate';

describe('formatDate', () => {
  it('formats a Sanity date as "08 Apr 2026"', () => {
    expect(formatDate('2026-04-08')).toBe('08 Apr 2026');
  });

  it('zero-pads the day', () => {
    expect(formatDate('2026-04-01')).toBe('01 Apr 2026');
  });

  it('returns an empty string for a missing date rather than throwing', () => {
    // Every caller renders the result directly, so `null` has to be safe — a `publishDate` is
    // optional on the document.
    expect(formatDate(null)).toBe('');
    expect(formatDate('')).toBe('');
  });

  /**
   * The regression guard for a live bug.
   *
   * A Sanity `date` is a calendar date with no time and no zone, stored as `2026-04-08`.
   * `new Date()` parses that as UTC midnight, and `toLocaleDateString` renders it in the *browser's*
   * timezone — so before `timeZone: 'UTC'` was pinned, every reader west of UTC saw the previous
   * day, and a post published on the 8th read "07 Apr 2026" in Los Angeles and New York. Formatting
   * happens client side, so it is the reader's location that decides, not the server's.
   *
   * This assertion states the contract rather than the observed output: the rendered date must be
   * the calendar date that was entered, in every zone. Without the fix it passes in Sydney and fails
   * in Los Angeles — which is both a flaky test and a real defect.
   */
  it('renders the entered calendar date regardless of the reader timezone', () => {
    const original = process.env.TZ;

    /*
     * `finally`, because a failing assertion throws out of the loop and would otherwise leave the
     * last zone set for every later test sharing this worker — a genuine failure would be followed
     * by unrelated date tests failing in a distant file, and the cause would not be obvious.
     */
    try {
      // Kiritimati (UTC+14) and Midway (UTC-11) are the extremes either side.
      for (const tz of ['Pacific/Kiritimati', 'Australia/Sydney', 'UTC', 'America/Los_Angeles', 'Pacific/Midway']) {
        process.env.TZ = tz;
        expect(formatDate('2026-04-08'), `wrong date in ${tz}`).toBe('08 Apr 2026');
      }
    } finally {
      process.env.TZ = original;
    }
  });
});
