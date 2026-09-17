import { describe, expect, it } from 'vitest';

import formatDateRange from './formatDateRange';

describe('formatDateRange', () => {
  it('compresses a range inside one month to a closed en dash', () => {
    expect(formatDateRange('2026-05-29', '2026-05-31')).toBe('29–31 May 2026');
  });

  it('spaces the dash when either element contains a space', () => {
    expect(formatDateRange('2026-04-30', '2026-05-02')).toBe('30 Apr – 02 May 2026');
    expect(formatDateRange('2026-12-31', '2027-01-01')).toBe('31 Dec 2026 – 01 Jan 2027');
  });

  it('renders a one-day wedding as a single date, not a range', () => {
    expect(formatDateRange('2026-05-29', '2026-05-29')).toBe('29 May 2026');
  });

  it('renders whichever date it has when the other is blank', () => {
    // Both fields are optional on `weddingSettings`, and an editor filling in only the first day is
    // the likeliest half-filled state. A range with a hole in it is not an acceptable rendering.
    expect(formatDateRange('2026-05-29', null)).toBe('29 May 2026');
    expect(formatDateRange(null, '2026-05-31')).toBe('31 May 2026');
    expect(formatDateRange('2026-05-29', '')).toBe('29 May 2026');
  });

  it('returns an empty string when there is nothing to render rather than throwing', () => {
    // The caller renders the result directly and drops the whole line on an empty string.
    expect(formatDateRange(null, null)).toBe('');
    expect(formatDateRange(undefined, undefined)).toBe('');
    expect(formatDateRange('', '')).toBe('');
  });

  it('returns an empty string for an unparseable value rather than printing "Invalid Date"', () => {
    expect(formatDateRange('not-a-date', '2026-05-31')).toBe('');
    expect(formatDateRange('2026-05-29', 'not-a-date')).toBe('');
  });

  it('orders a backwards pair rather than rendering it as entered', () => {
    // An end before a start is an editor typo and nothing else; "31 May – 29 May" is not a range.
    expect(formatDateRange('2026-05-31', '2026-05-29')).toBe('29–31 May 2026');
    expect(formatDateRange('2027-01-01', '2026-12-31')).toBe('31 Dec 2026 – 01 Jan 2027');
  });

  /**
   * The same regression `formatDate` guards, one level up.
   *
   * A Sanity `date` is a calendar date with no zone. Formatting happens wherever the component
   * renders, so without `timeZone: 'UTC'` every reader west of UTC sees the previous day — and here
   * that is worse than an off-by-one, because the *compression* is decided by comparing the two
   * dates' month and year. Read locally, "31 May → 01 Jun" becomes "30 May → 31 May" in Los Angeles
   * and the range collapses into a single-month form that names the wrong month.
   */
  it('renders the entered calendar dates regardless of the reader timezone', () => {
    const original = process.env.TZ;

    try {
      for (const tz of ['Pacific/Kiritimati', 'Australia/Sydney', 'UTC', 'America/Los_Angeles', 'Pacific/Midway']) {
        process.env.TZ = tz;
        expect(formatDateRange('2026-05-31', '2026-06-01'), `wrong range in ${tz}`).toBe('31 May – 01 Jun 2026');
      }
    } finally {
      process.env.TZ = original;
    }
  });
});
