import 'server-only';
import type { Guest } from '@/helpers/guests';
import { stayPriceOf } from '@/helpers/guests';
import { thankYouVariables } from '@/helpers/thankYouEmail';
import type { RsvpReply } from '@/tools/helpers/rsvpSubmission';

import { hasThankYouEmail, sendThankYouEmail } from './loops';
import { replyExtrasFor } from './replyExtras';
import { guestHomeLinkFor } from './sheet';

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
    const extras = await replyExtrasFor(guest);
    await sendThankYouEmail({
      dataVariables: thankYouVariables({
        firstName: guest.firstName || reply.name.split(' ')[0],
        homeLink: guestHomeLinkFor(guest.id),
        intro: extras.emailIntro,
        payment: extras.payment,
        stay: stayPriceOf(guest, { extraNight: reply.extraNight }),
        travel: extras.travel
      }),
      idempotencyKey: `thank-you-${guest.id}-${submittedAt.getTime()}`,
      to: reply.email
    });
  } catch (error) {
    // The message only — never the error object, which can carry the request and its key.
    console.error(`[Thank-you email] Not sent: ${error instanceof Error ? error.message : 'unknown error'}`);
  }
};
