import { createHmac, timingSafeEqual } from 'node:crypto';

import { normaliseGuestId } from './guests';

/** The cookie that remembers a guest has entered their ID. */
export const GUEST_COOKIE = 'guest';

/** 180 days — past the wedding, so nobody is asked again partway through. */
export const GUEST_COOKIE_MAX_AGE = 60 * 60 * 24 * 180;

const signatureOf = (id: string, secret: string) => createHmac('sha256', secret).update(id).digest('base64url');

/**
 * The cookie value for a guest: their ID and an HMAC of it, `SAM-4821.<signature>`. The signature is
 * what stops anyone setting `guest=SAM-4821` by hand — the proxy trusts a cookie only it could have
 * written, without looking the guest up on every request.
 */
export const signGuestSession = (id: string, secret: string): string => {
  const normalised = normaliseGuestId(id);
  return `${normalised}.${signatureOf(normalised, secret)}`;
};

/** The guest ID in a cookie value, or `undefined` when it is missing, malformed or not ours. */
export const verifyGuestSession = (value: string | undefined, secret: string | undefined): string | undefined => {
  if (!value || !secret) {
    return undefined;
  }
  const dot = value.lastIndexOf('.');
  if (dot <= 0) {
    return undefined;
  }
  const id = value.slice(0, dot);
  const given = Buffer.from(value.slice(dot + 1));
  const expected = Buffer.from(signatureOf(id, secret));
  return given.length === expected.length && timingSafeEqual(given, expected) ? id : undefined;
};
