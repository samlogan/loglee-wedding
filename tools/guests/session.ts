import 'server-only';
import { cookies } from 'next/headers';

import type { Guest } from '@/helpers/guests';
import { GUEST_COOKIE, GUEST_COOKIE_MAX_AGE, signGuestSession, verifyGuestSession } from '@/helpers/guestSession';

import { findGuest } from './sheet';

/** The secret the guest cookie is signed with. Unset means nobody can sign in — the site stays shut. */
export const guestSessionSecret = () => process.env.GUEST_SESSION_SECRET;

/**
 * The ID the couple's password signs in as. Not a row in the sheet, so the site treats it as someone
 * who has entered but has nothing to prefill — no stay card, no payment details.
 */
export const COUPLE_ID = 'COUPLE';

/**
 * The ID a Sanity editor is signed in as when the Studio's visual editor opens the site
 * (`app/api/draft`). Like `COUPLE`, not a row in the sheet.
 */
export const EDITOR_ID = 'EDITOR';

/**
 * Whether a typed value is the couple's password (`COUPLE_PASSWORD`), however it was cased or spaced.
 * `false` whenever the variable is unset, so a blank password can never open the site.
 */
export const isCouplePassword = (value: string) => {
  const password = process.env.COUPLE_PASSWORD?.trim().toLowerCase();
  return Boolean(password) && value.trim().toLowerCase() === password;
};

/** Remember a guest (or the couple) on this browser. Call from a server action or route handler only. */
export const signIn = async (guest: Pick<Guest, 'id'>) => {
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
