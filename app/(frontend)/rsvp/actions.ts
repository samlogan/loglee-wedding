'use server';

import type { RsvpFormState } from '@/components/RsvpForm/contract';

/**
 * The RSVP form's server action — deliberately a stub that stores nothing.
 *
 * MAM-1903 replaces the body: validation of every entry (the client's is a convenience, and this is
 * a public endpoint), the honeypot, rate limiting, and writing the `rsvp` document with a
 * server-only token. The signature and the `RsvpFormState` it returns are the contract that work
 * builds against — see `components/RsvpForm/contract.ts` for the `FormData` it receives.
 *
 * Until then it refuses every reply, and says so. It must never return `success`: that state fills
 * the submit button with "Saved", and a guest who sees it has every reason to believe their reply
 * reached the couple. An error that tells them it did not is the only honest answer while nothing is
 * being written.
 *
 * The parameters are named for the contract and unused on purpose.
 */
export const submitRsvp = async (_previousState: RsvpFormState, _formData: FormData): Promise<RsvpFormState> => ({
  fieldErrors: {},
  message: "We're not taking RSVPs through the site just yet, so your reply hasn't been saved. Please try again soon.",
  status: 'error'
});
