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
   *
   * Three pairs, not one, because the helper makes three separate zone-sensitive decisions and a
   * single pair only covers one of them. Verified by reverting each pin in turn and watching this
   * test fail:
   *
   * - **the cross-month pair** catches `timeZone: 'UTC'` coming off `partial()`/`formatDate` (in
   *   Pacific/Midway the range renders as "30 May – 31 May 2026") and `getUTCMonth()` becoming
   *   `getMonth()` (in America/Los_Angeles both dates read as May and the range collapses to the
   *   closed form);
   * - **the cross-year pair** is the only one that can catch `getUTCFullYear()` — in
   *   Pacific/Kiritimati (UTC+14) both dates read as January 2027, so "31 Dec 2026 – 01 Jan 2027"
   *   collapses to "31–01 Jan 2027". With only the first pair that regression passed silently;
   * - **the same-month pair** is the only one that reaches `partial(earlier, DAY)`, the day-only
   *   branch, which nothing else in this sweep executes.
   */
  it('renders the entered calendar dates regardless of the reader timezone', () => {
    const original = process.env.TZ;

    const cases: [string, string, string][] = [
      ['2026-05-31', '2026-06-01', '31 May – 01 Jun 2026'],
      ['2026-12-31', '2027-01-01', '31 Dec 2026 – 01 Jan 2027'],
      ['2026-05-29', '2026-05-31', '29–31 May 2026']
    ];

    try {
      for (const tz of ['Pacific/Kiritimati', 'Australia/Sydney', 'UTC', 'America/Los_Angeles', 'Pacific/Midway']) {
        process.env.TZ = tz;

        /*
         * The sweep asserts on its own instrument first.
         *
         * Setting `process.env.TZ` only moves the ambient zone because Node re-reads it per call in
         * the default forked-process pool. Under `pool: 'threads'` a worker's `process.env` is a
         * copy and nothing calls `tzset`, so every iteration below would silently re-run in the same
         * zone and five assertions would collapse into one — a sweep that passes while testing
         * nothing is worse than no sweep.
         */
        expect(Intl.DateTimeFormat().resolvedOptions().timeZone, 'the ambient timezone did not move').toBe(tz);

        for (const [start, end, expected] of cases) {
          expect(formatDateRange(start, end), `wrong range for ${start}..${end} in ${tz}`).toBe(expected);
        }
      }
    } finally {
      /*
       * `delete`, not assignment. `process.env` coerces its values to strings, so when `TZ` was
       * never set — the normal case; nothing in `.env.development` or `vitest.config.ts` sets it —
       * `process.env.TZ = undefined` writes the literal string `'undefined'` and pins the worker to
       * an invalid zone for every test that runs after this one in the same file.
       */
      if (original === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = original;
      }
    }
  });
});
