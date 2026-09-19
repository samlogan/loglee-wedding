import formatDate from './formatDate';

/**
 * The same locale and zone `formatDate` pins, for the partial forms below.
 *
 * `timeZone: 'UTC'` is load-bearing for exactly the reason it is there — a Sanity `date` is a
 * calendar date with no time and no zone, so rendering it in the reader's zone shows the previous
 * day everywhere west of UTC. The comparisons further down use the `getUTC*` accessors for the same
 * reason: deciding "same month" in local time would compress a range one way in Sydney and another
 * in Los Angeles.
 */
const partial = (date: Date, options: Intl.DateTimeFormatOptions): string =>
  date.toLocaleDateString('en-GB', { ...options, timeZone: 'UTC' });

const DAY: Intl.DateTimeFormatOptions = { day: '2-digit' };
const DAY_MONTH: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };

/** Two digits, zero-padded — the unit every part of the numeric form is written in. */
const twoDigits = (value: number): string => String(value).padStart(2, '0');

// The numeric form's shapes, each built on the last: "12", "12.02", "12.02.27".
const dd = (date: Date): string => twoDigits(date.getUTCDate());
const ddmm = (date: Date): string => `${dd(date)}.${twoDigits(date.getUTCMonth() + 1)}`;

/**
 * `text` — the month as a word: "12–14 Feb 2027". The default, and what the footer prints.
 * `numeric` — day, month and year as dotted pairs: "12–14.02.27". What the home hero draws.
 */
export type DateRangeStyle = 'text' | 'numeric';

export interface FormatDateRangeOptions {
  style?: DateRangeStyle;
}

/**
 * The three shapes a range element can take, one set per style.
 *
 * `full` is the whole date; `dayMonth` and `day` are what is left of the *earlier* date once the
 * part the two dates share has been moved to the end. `full` takes the ISO string as well as the
 * parsed date so the text style can hand it to `formatDate` untouched — see the note on `text`.
 */
interface RangeParts {
  day: (date: Date) => string;
  dayMonth: (date: Date) => string;
  full: (date: Date, iso: string) => string;
}

const PARTS: Record<DateRangeStyle, RangeParts> = {
  /*
   * The full form is `formatDate`'s, unchanged, so a range and a single date are the same
   * typographic language rather than two — and every string the default style produced before the
   * numeric one existed is still produced byte for byte.
   */
  text: {
    day: (date) => partial(date, DAY),
    dayMonth: (date) => partial(date, DAY_MONTH),
    full: (_date, iso) => formatDate(iso)
  },
  /*
   * Built from the `getUTC*` accessors rather than from `Intl`, because `en-GB`'s numeric date is
   * slash-separated and the design's is dotted — rewriting the separators out of a localised string
   * would be a regex over output the runtime is free to change. The accessors are zone-pinned for
   * the same reason `partial` is.
   *
   * A two-digit year, as drawn. It cannot tell 2027 from 2127; nothing on a wedding site needs it to.
   */
  numeric: {
    day: dd,
    dayMonth: ddmm,
    full: (date) => `${ddmm(date)}.${twoDigits(date.getUTCFullYear() % 100)}`
  }
};

/**
 * One rule for the dash, for both styles: closed when the earlier element contains no space,
 * spaced when it does.
 *
 * The earlier element is the part that *differs* — whatever the two dates share has been moved onto
 * the later one — so it is the one whose shape decides. "29" closes up against "31 May 2026"; "30 Apr"
 * and "31 Dec 2026" open the dash out. Every numeric element is space-free, so the numeric style
 * always closes up: "30.04–02.05.26". `\s` also matches the no-break spaces some ICU builds put
 * between a day and a month name.
 */
const joinRange = (earlier: string, later: string): string => `${earlier}${/\s/.test(earlier) ? ' – ' : '–'}${later}`;

/**
 * Formats a pair of Sanity `date` fields as one range, compressed to whatever the two share.
 *
 *   29 May → 31 May 2026         "29–31 May 2026"             "29–31.05.26"
 *   30 Apr → 02 May 2026         "30 Apr – 02 May 2026"       "30.04–02.05.26"
 *   31 Dec 2026 → 01 Jan 2027    "31 Dec 2026 – 01 Jan 2027"  "31.12.26–01.01.27"
 *   29 May → 29 May 2026         "29 May 2026"                "29.05.26"
 *
 * The left column is the default `text` style; the right is `{ style: 'numeric' }`. The two share
 * everything below — the compression, the ordering and every blank state — and differ only in how an
 * element is written and, through `joinRange`, in whether the dash is spaced.
 *
 * Every blank state is a supported one, because both fields are optional on `weddingSettings` and
 * the footer and the home hero render whatever they are given:
 *
 * - one date missing → the other is rendered alone, not as a range with a hole in it;
 * - both missing → an empty string, which the caller treats as "no line";
 * - an unparseable value → an empty string rather than the literal "Invalid Date" `toLocaleDateString`
 *   would otherwise print onto the page.
 *
 * A backwards pair (end before start, which is an editor typo and nothing else) is ordered rather
 * than rendered as entered: "31 May – 29 May" is not a range, and the correction loses nothing.
 */
const formatDateRange = (start?: string | null, end?: string | null, options: FormatDateRangeOptions = {}): string => {
  const parts = PARTS[options.style ?? 'text'];
  const from = start || end || null;
  const to = end || start || null;

  if (!(from && to)) {
    return '';
  }

  const a = new Date(from);
  const b = new Date(to);

  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) {
    return '';
  }

  const ordered = a.getTime() <= b.getTime();
  const earlier = ordered ? a : b;
  const later = ordered ? b : a;
  const earlierIso = ordered ? from : to;
  const laterIso = ordered ? to : from;

  const sameYear = earlier.getUTCFullYear() === later.getUTCFullYear();
  const sameMonth = sameYear && earlier.getUTCMonth() === later.getUTCMonth();

  if (sameMonth && earlier.getUTCDate() === later.getUTCDate()) {
    return parts.full(earlier, earlierIso);
  }

  if (sameMonth) {
    return joinRange(parts.day(earlier), parts.full(later, laterIso));
  }

  if (sameYear) {
    return joinRange(parts.dayMonth(earlier), parts.full(later, laterIso));
  }

  return joinRange(parts.full(earlier, earlierIso), parts.full(later, laterIso));
};

export default formatDateRange;
