/**
 * Formats a Sanity `date` field as "24 Dec 2043".
 *
 * `timeZone: 'UTC'` is load-bearing, not cosmetic. A Sanity `date` is a calendar date with no time
 * and no zone, stored as `2026-06-29`. `new Date()` parses that as UTC midnight, and
 * `toLocaleDateString` then renders it in the *browser's* timezone, so every reader west of UTC saw
 * the previous day: a post published on the 8th read "07 Apr 2026" in Los Angeles and New York.
 * `en-GB` only sets the locale, not the zone. Because the formatting happens client side, it is the
 * reader's location that decides, not the server's.
 *
 * Formatting in UTC renders the calendar date that was actually entered, identically everywhere.
 */
const formatDate = (date: string | null): string => {
  if (!date) {
    return '';
  }
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
    year: 'numeric'
  });
};

export default formatDate;
