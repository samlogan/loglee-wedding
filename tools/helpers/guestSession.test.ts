import { describe, expect, it } from 'vitest';

import { signGuestSession, verifyGuestSession } from './guestSession';

const SECRET = 'test-secret';

describe('guest session cookie', () => {
  it('round-trips a guest ID, normalised', () => {
    expect(verifyGuestSession(signGuestSession('sam-4821', SECRET), SECRET)).toBe('SAM-4821');
  });

  it('rejects a hand-written or tampered cookie', () => {
    const signed = signGuestSession('SAM-4821', SECRET);
    expect(verifyGuestSession('SAM-4821', SECRET)).toBeUndefined();
    expect(verifyGuestSession(signed.replace('SAM-4821', 'LAUREN-1234'), SECRET)).toBeUndefined();
    expect(verifyGuestSession(`${signed}x`, SECRET)).toBeUndefined();
  });

  it('rejects a cookie signed with another secret, and anything when there is no secret', () => {
    expect(verifyGuestSession(signGuestSession('SAM-4821', 'other'), SECRET)).toBeUndefined();
    expect(verifyGuestSession(signGuestSession('SAM-4821', SECRET), undefined)).toBeUndefined();
    expect(verifyGuestSession(undefined, SECRET)).toBeUndefined();
    expect(verifyGuestSession('', SECRET)).toBeUndefined();
  });
});
