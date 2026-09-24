'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { GUEST_ID_FIELD } from '@/components/GuestEntry/contract';
import type { GuestEntryState } from '@/components/GuestEntry/contract';
import { guestSessionSecret, signIn } from '@/tools/guests/session';
import { findGuest } from '@/tools/guests/sheet';
import createRateLimiter from '@/tools/helpers/rateLimiter';

/*
 * Guest IDs are a name and four digits, so they are guessable with enough tries. Ten attempts per
 * connection per ten minutes is plenty for a guest mistyping theirs, and far too few to walk 9,000.
 */
const limiter = createRateLimiter({ limit: 10, windowMs: 10 * 60 * 1000 });

/** Only a path on this site — never `//elsewhere.com` or an absolute URL. */
const safeNext = (value: FormDataEntryValue | null) =>
  typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/';

export const enterSite = async (_previous: GuestEntryState, formData: FormData): Promise<GuestEntryState> => {
  if (!guestSessionSecret()) {
    console.error('[Guest entry] GUEST_SESSION_SECRET is not set, so nobody can sign in.');
    return { message: 'Something went wrong on our side. Please try again later.', status: 'error' };
  }

  const requestHeaders = await headers();
  const connection =
    requestHeaders.get('x-nf-client-connection-ip') ?? requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (connection && !limiter.attempt(connection)) {
    return { message: 'Too many tries. Please wait a few minutes and try again.', status: 'error' };
  }

  const id = formData.get(GUEST_ID_FIELD);
  let guest;
  try {
    guest = await findGuest(typeof id === 'string' ? id : '');
  } catch (error) {
    console.error('[Guest entry] Could not read the guest sheet.', error);
    return { message: 'Something went wrong on our side. Please try again in a minute.', status: 'error' };
  }
  if (!guest) {
    return {
      message: "We couldn't find that guest ID. Check your invitation and try again.",
      status: 'error'
    };
  }

  await signIn(guest);
  redirect(safeNext(formData.get('next')));
};
