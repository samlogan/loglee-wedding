import 'server-only';
import { cookies } from 'next/headers';

import type { Guest } from '@/helpers/guests';
import { GUEST_COOKIE, GUEST_COOKIE_MAX_AGE, signGuestSession, verifyGuestSession } from '@/helpers/guestSession';

import { findGuest } from './sheet';

/** The secret the guest cookie is signed with. Unset means nobody can sign in — the site stays shut. */
export const guestSessionSecret = () => process.env.GUEST_SESSION_SECRET;

/** Remember a guest on this browser. Call from a server action or route handler only. */
export const signIn = async (guest: Guest) => {
  const secret = guestSessionSecret();
  if (!secret) {
    throw new Error('GUEST_SESSION_SECRET is not set');
  }
  (await cookies()).set(GUEST_COOKIE, signGuestSession(guest.id, secret), {
    httpOnly: true,
    maxAge: GUEST_COOKIE_MAX_AGE,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  });
};

/** The guest this browser signed in as, looked up in the sheet — or `undefined`. */
export const currentGuest = async (): Promise<Guest | undefined> => {
  const id = verifyGuestSession((await cookies()).get(GUEST_COOKIE)?.value, guestSessionSecret());
  return id ? findGuest(id) : undefined;
};
