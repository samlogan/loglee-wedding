import { describe, expect, it } from 'vitest';

import { WEDDING_COUNTDOWN_TARGET, countdownParts } from './countdown';

const target = Date.parse(WEDDING_COUNTDOWN_TARGET);
const SECOND = 1000;
const DAY = 86_400 * SECOND;

describe('WEDDING_COUNTDOWN_TARGET', () => {
  it('is 3pm in Sydney on Friday 12 February 2027 — 4am UTC', () => {
    expect(new Date(target).toISOString()).toBe('2027-02-12T04:00:00.000Z');
  });
});

describe('countdownParts', () => {
  it('splits the time left into days, hours, minutes and seconds', () => {
    const now = target - (3 * DAY + 4 * 3600 * SECOND + 5 * 60 * SECOND + 6 * SECOND);
    expect(countdownParts(target, now)).toEqual({ days: 3, hours: 4, minutes: 5, seconds: 6 });
  });

  it('floors, so it never shows more time than is left', () => {
    expect(countdownParts(target, target - 59_900)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 59 });
  });

  it('is null once the moment arrives, and after it', () => {
    expect(countdownParts(target, target - 500)).toBeNull();
    expect(countdownParts(target, target)).toBeNull();
    expect(countdownParts(target, target + DAY)).toBeNull();
  });

  it('is null for a target that cannot be parsed', () => {
    expect(countdownParts(Number.NaN, 0)).toBeNull();
  });
});
