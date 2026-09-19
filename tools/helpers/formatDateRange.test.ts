import { describe, expect, it } from 'vitest';

import formatDateRange from './formatDateRange';
import type { DateRangeStyle } from './formatDateRange';

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

  /*
   * Every test above predates the `style` option and calls without it, so they are the proof that
   * adding it changed nothing for the footer, the one caller that existed. This one closes the other
   * half: omitting the option, passing an empty one and naming the default are the same call.
   */
  it('treats an omitted, empty or explicit `text` style as the same default', () => {
    const pairs: [string | null, string | null][] = [
      ['2026-05-29', '2026-05-31'],
      ['2026-04-30', '2026-05-02'],
      ['2026-12-31', '2027-01-01'],
      ['2026-05-29', '2026-05-29'],
      ['2026-05-29', null],
      [null, null],
      ['not-a-date', '2026-05-31'],
      ['2027-01-01', '2026-12-31']
    ];

    for (const [start, end] of pairs) {
      const bare = formatDateRange(start, end);

      expect(formatDateRange(start, end, {}), `empty options for ${start}..${end}`).toBe(bare);
      expect(formatDateRange(start, end, { style: 'text' }), `explicit text for ${start}..${end}`).toBe(bare);
    }
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
   * Three pairs per style, not one, because the helper makes three separate zone-sensitive decisions
   * and a single pair only covers one of them. Verified by reverting each pin in turn and watching
   * this test fail:
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
   *
   * The numeric style writes its elements from the `getUTC*` accessors directly, so the same three
   * pairs pin its three accessors too, and it is the zones *west* of UTC that catch them: a Sanity
   * date parses as UTC midnight, which is still the same calendar day anywhere east. In
   * America/Los_Angeles a local `getDate()` prints "29–31.05.26" as "28–30.05.26", a local
   * `getMonth()` prints the cross-month pair's "01.06.26" as "01.05.26", and a local `getFullYear()`
   * prints the cross-year pair's "01.01.27" as "01.01.26".
   */
  it('renders the entered calendar dates regardless of the reader timezone', () => {
    const original = process.env.TZ;

    const cases: [string, string, DateRangeStyle, string][] = [
      ['2026-05-31', '2026-06-01', 'text', '31 May – 01 Jun 2026'],
      ['2026-12-31', '2027-01-01', 'text', '31 Dec 2026 – 01 Jan 2027'],
      ['2026-05-29', '2026-05-31', 'text', '29–31 May 2026'],
      ['2026-05-31', '2026-06-01', 'numeric', '31.05–01.06.26'],
      ['2026-12-31', '2027-01-01', 'numeric', '31.12.26–01.01.27'],
      ['2026-05-29', '2026-05-31', 'numeric', '29–31.05.26']
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

        for (const [start, end, style, expected] of cases) {
          expect(formatDateRange(start, end, { style }), `wrong ${style} range for ${start}..${end} in ${tz}`).toBe(
            expected
          );
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

/**
 * The home hero's form — "12–14.02.27" in node 1:68 — with every rule above carried across: the
 * same compression, the same ordering, the same blank states. What changes is how an element is
 * written, and so whether the dash is spaced: no numeric element contains a space, so it never is.
 */
describe('formatDateRange, numeric style', () => {
  const numeric = (start?: string | null, end?: string | null) => formatDateRange(start, end, { style: 'numeric' });

  it('draws the design’s own range', () => {
    // `weddingSettings` holds 2027-02-12 → 2027-02-14; the comp prints "12–14.02.27".
    expect(numeric('2027-02-12', '2027-02-14')).toBe('12–14.02.27');
  });

  it('compresses to whatever the two dates share, with a closed dash every time', () => {
    // Same month: only the days differ.
    expect(numeric('2026-05-29', '2026-05-31')).toBe('29–31.05.26');
    // Same year: the day and month differ, the year is shared.
    expect(numeric('2026-04-30', '2026-05-02')).toBe('30.04–02.05.26');
    // Nothing shared: both dates in full.
    expect(numeric('2026-12-31', '2027-01-01')).toBe('31.12.26–01.01.27');
  });

  it('zero-pads every element, as the comp does', () => {
    expect(numeric('2027-01-05', '2027-01-09')).toBe('05–09.01.27');
    expect(numeric('2027-01-05', '2027-03-01')).toBe('05.01–01.03.27');
    // The year too: 2005 is "05", not "5".
    expect(numeric('2005-07-04', '2005-07-04')).toBe('04.07.05');
  });

  it('renders a one-day wedding as a single date, not a range', () => {
    expect(numeric('2026-05-29', '2026-05-29')).toBe('29.05.26');
  });

  it('renders whichever date it has when the other is blank', () => {
    expect(numeric('2026-05-29', null)).toBe('29.05.26');
    expect(numeric(null, '2026-05-31')).toBe('31.05.26');
    expect(numeric('2026-05-29', '')).toBe('29.05.26');
  });

  it('returns an empty string when there is nothing to render', () => {
    expect(numeric(null, null)).toBe('');
    expect(numeric(undefined, undefined)).toBe('');
    expect(numeric('', '')).toBe('');
  });

  it('returns an empty string for an unparseable value', () => {
    // No "NaN.NaN.NaN" — the validity check runs before either style writes anything.
    expect(numeric('not-a-date', '2026-05-31')).toBe('');
    expect(numeric('2026-05-29', 'not-a-date')).toBe('');
  });

  it('orders a backwards pair rather than rendering it as entered', () => {
    expect(numeric('2026-05-31', '2026-05-29')).toBe('29–31.05.26');
    expect(numeric('2027-01-01', '2026-12-31')).toBe('31.12.26–01.01.27');
  });
});
