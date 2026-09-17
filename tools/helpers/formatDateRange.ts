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

/**
 * Formats a pair of Sanity `date` fields as one range, compressed to whatever the two share.
 *
 *   29 May → 31 May 2026    "29–31 May 2026"        closed en dash: neither element contains a space
 *   30 Apr → 02 May 2026    "30 Apr – 02 May 2026"  spaced en dash: the elements do
 *   31 Dec 2026 → 01 Jan 2027    "31 Dec 2026 – 01 Jan 2027"
 *   29 May → 29 May 2026    "29 May 2026"
 *
 * The full form is `formatDate`'s, unchanged, so a range and a single date are the same typographic
 * language rather than two.
 *
 * Every blank state is a supported one, because both fields are optional on `weddingSettings` and
 * the footer renders whatever it is given:
 *
 * - one date missing → the other is rendered alone, not as a range with a hole in it;
 * - both missing → an empty string, which the caller treats as "no line";
 * - an unparseable value → an empty string rather than the literal "Invalid Date" `toLocaleDateString`
 *   would otherwise print onto the page.
 *
 * A backwards pair (end before start, which is an editor typo and nothing else) is ordered rather
 * than rendered as entered: "31 May – 29 May" is not a range, and the correction loses nothing.
 */
const formatDateRange = (start?: string | null, end?: string | null): string => {
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
    return formatDate(earlierIso);
  }

  if (sameMonth) {
    return `${partial(earlier, DAY)}–${formatDate(laterIso)}`;
  }

  if (sameYear) {
    return `${partial(earlier, DAY_MONTH)} – ${formatDate(laterIso)}`;
  }

  return `${formatDate(earlierIso)} – ${formatDate(laterIso)}`;
};

export default formatDateRange;
