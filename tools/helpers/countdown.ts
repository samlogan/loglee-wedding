/**
 * The ceremony weekend's start — 3pm on Friday 12 February 2027 in Jamberoo. February is daylight
 * saving in NSW, so the offset is AEDT's +11:00. Stated as an instant with its offset, so the
 * countdown is right whatever time zone the guest's device is in.
 */
export const WEDDING_COUNTDOWN_TARGET = '2027-02-12T15:00:00+11:00';

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

/**
 * Whole days, hours, minutes and seconds from `now` until `target`, or `null` once it has arrived.
 *
 * Floored at every step, so the display never claims more time than is left: at 59.9 seconds out it
 * reads 59, and the moment it would read all zeros it returns `null` instead.
 */
export const countdownParts = (target: number, now: number): CountdownParts | null => {
  const total = Math.floor((target - now) / 1000);

  if (!(total > 0)) {
    return null;
  }

  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60
  };
};
