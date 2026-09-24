import 'server-only';
import type { Guest } from '@/helpers/guests';
import { stayPriceOf } from '@/helpers/guests';
import { thankYouVariables } from '@/helpers/thankYouEmail';
import type { RsvpReply } from '@/tools/helpers/rsvpSubmission';

import { hasThankYouEmail, sendThankYouEmail } from './loops';
import { replyExtrasFor } from './replyExtras';
import { guestHomeLinkFor } from './sheet';

/**
 * What one guest's thank-you email says: their stay (with the Sunday night when `extraNight`), the
 * payment details for their region, their travel note and the intro, from Sanity. Shared by the real
 * send and the Studio's test send, so a test shows exactly what that guest would get.
 */
export const thankYouVariablesFor = async (
  guest: Guest,
  { extraNight = false, firstName }: { extraNight?: boolean; firstName?: string } = {}
) => {
  const extras = await replyExtrasFor(guest);
  return thankYouVariables({
    firstName: guest.firstName || firstName || '',
    homeLink: guestHomeLinkFor(guest.id),
    intro: extras.emailIntro,
    payment: extras.payment,
    stay: stayPriceOf(guest, { extraNight }),
    travel: extras.travel
  });
};

/**
 * Email a guest their thank-you once their reply is saved: their stay and total (the Sunday night
 * included when they took it), how to pay, and their travel note. To the address on the reply, which
 * the form prefills from the sheet.
 *
 * Best effort, like `markReplied`: the reply is already saved, so a failure is logged and never
 * reaches the guest. Sent for every saved change, so a guest who edits their reply gets the updated
 * total; the key is per reply, so a retried request does not send one twice.
 */
export const sendThankYou = async (guest: Guest, reply: RsvpReply, submittedAt: Date) => {
  if (!hasThankYouEmail()) {
    return;
  }
  try {
    await sendThankYouEmail({
      dataVariables: await thankYouVariablesFor(guest, {
        extraNight: reply.extraNight,
        firstName: reply.name.split(' ')[0]
      }),
      idempotencyKey: `thank-you-${guest.id}-${submittedAt.getTime()}`,
      to: reply.email
    });
  } catch (error) {
    // The message only — never the error object, which can carry the request and its key.
    console.error(`[Thank-you email] Not sent: ${error instanceof Error ? error.message : 'unknown error'}`);
  }
};
