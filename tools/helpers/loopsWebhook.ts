import { createHmac, timingSafeEqual } from 'node:crypto';

import type { GuestEmailKind } from './guestEmails';

/*=============================================>>>>>
= Opens and clicks, from Loops's webhooks =
===============================================>>>>>*/

/**
 * Loops cannot be asked who opened an email — its API has no such query — but it can tell the site as
 * it happens: a webhook per `email.opened` and `email.clicked` on a workflow email (the invitation and
 * the reminder; transactional emails, like the thank-you, are not tracked). `app/api/loops/webhook`
 * checks the signature here, and writes what happened into the guest's row (`markEmailActivity`).
 */

/** How old a webhook may be before it is refused, so a captured request cannot be replayed later. */
export const WEBHOOK_TOLERANCE_SECONDS = 5 * 60;

/**
 * Whether a webhook really came from Loops. Loops signs in the Standard Webhooks scheme: an HMAC-SHA256
 * of `{webhook-id}.{webhook-timestamp}.{raw body}`, keyed with the base64 part of the `whsec_…` signing
 * secret, sent base64 in `webhook-signature` as one or more space-separated `v1,<signature>`.
 */
export const isLoopsSignatureValid = ({
  body,
  id,
  now = Date.now(),
  secret,
  signature,
  timestamp
}: {
  body: string;
  id: string | null;
  now?: number;
  secret: string | undefined;
  signature: string | null;
  timestamp: string | null;
}): boolean => {
  if (!body || !id || !secret || !signature || !timestamp) {
    return false;
  }
  const sentAt = Number(timestamp);
  if (!Number.isFinite(sentAt) || Math.abs(now / 1000 - sentAt) > WEBHOOK_TOLERANCE_SECONDS) {
    return false;
  }
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const expected = createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest();
  return signature.split(' ').some((part) => {
    const [version, value = ''] = part.split(',');
    const given = Buffer.from(value, 'base64');
    return version === 'v1' && given.length === expected.length && timingSafeEqual(given, expected);
  });
};

export type EmailActivity = 'opened' | 'clicked';

/** What one webhook says happened: which email, to whom, and whether it was opened or clicked. */
export interface EmailActivityEvent {
  activity: EmailActivity;
  email: string;
  kind: GuestEmailKind;
}

interface LoopsWebhookPayload {
  eventName?: string;
  sourceType?: string;
  loopName?: string;
  contactIdentity?: { email?: string };
  email?: { subject?: string };
}

/**
 * The open or click a webhook reports, or `undefined` for anything else — another event, a campaign,
 * a contact with no address.
 *
 * Which email it was is read from the workflow's name, then the subject: anything mentioning a
 * reminder is the reminder, every other workflow email the invitation. Name the reminder workflow in
 * Loops with "reminder" in it (the subject already has it).
 */
export const emailActivityOf = (payload: unknown): EmailActivityEvent | undefined => {
  const event = (payload ?? {}) as LoopsWebhookPayload;
  const activity = ({ 'email.clicked': 'clicked', 'email.opened': 'opened' } as const)[event.eventName ?? ''];
  const email = event.contactIdentity?.email?.trim().toLowerCase();
  if (!activity || event.sourceType !== 'loop' || !email) {
    return undefined;
  }
  const label = `${event.loopName ?? ''} ${event.email?.subject ?? ''}`.toLowerCase();
  return { activity, email, kind: label.includes('remind') ? 'reminder' : 'invitation' };
};

/**
 * What to write into the guest's Opened cell, or `undefined` to leave it: "Opened 27 Sept" the first
 * time it is opened, "Clicked 27 Sept" when a link in it is clicked. A click is never downgraded by a
 * later open, and the first open's date is kept.
 */
export const nextActivityCell = (current: string, activity: EmailActivity, at: Date): string | undefined => {
  const was = current.trim().toLowerCase();
  if (was.startsWith('clicked') || (activity === 'opened' && was.startsWith('opened'))) {
    return undefined;
  }
  const day = at.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', timeZone: 'Australia/Sydney' });
  return `${activity === 'clicked' ? 'Clicked' : 'Opened'} ${day}`;
};
