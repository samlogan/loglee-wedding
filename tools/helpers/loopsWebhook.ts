import { createHmac, timingSafeEqual } from 'node:crypto';

/*=============================================>>>>>
= What happened to each email, from Loops's webhooks =
===============================================>>>>>*/

/**
 * Loops cannot be asked what happened to an email — its API has no such query — but it tells the site
 * as it happens, with a webhook per event: delivered, opened, clicked, bounced (soft or hard), marked
 * as spam. `app/api/loops/webhook` checks the signature here, and writes the latest into the guest's
 * row, one column per email (`markEmailActivity`).
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

/** Which of the guest emails a webhook is about. The thank-you is the one transactional email. */
export type TrackedEmail = 'invitation' | 'reminder' | 'thankYou';

/**
 * What happened to an email, in the order a guest's cell moves through them — see `nextActivityCell`.
 * "Sent" first: the site writes it when Loops accepts the email, and every event after replaces it.
 * A soft bounce is a temporary failure that Loops retries, so a delivery after it replaces it; a hard
 * bounce (the address does not exist) and a spam report are what the couple most need to see, so
 * nothing replaces them.
 */
export const EMAIL_ACTIVITY = {
  // Written by the site itself the moment Loops accepts the email — no webhook reports it.
  sent: { event: null, label: 'Sent', rank: 1 },
  softBounced: { event: 'email.softBounced', label: 'Soft bounce', rank: 2 },
  delivered: { event: 'email.delivered', label: 'Delivered', rank: 3 },
  opened: { event: 'email.opened', label: 'Opened', rank: 4 },
  clicked: { event: 'email.clicked', label: 'Clicked', rank: 5 },
  hardBounced: { event: 'email.hardBounced', label: 'Bounced', rank: 6 },
  spamReported: { event: 'email.spamReported', label: 'Marked spam', rank: 7 }
} as const;

export type EmailActivity = keyof typeof EMAIL_ACTIVITY;

const ACTIVITY_BY_EVENT = new Map(
  Object.entries(EMAIL_ACTIVITY).flatMap(([activity, { event }]) =>
    event ? [[event as string, activity as EmailActivity] as const] : []
  )
);

/** What one webhook says happened: which email, to whom, and what. */
export interface EmailActivityEvent {
  activity: EmailActivity;
  email: string;
  kind: TrackedEmail;
}

interface LoopsWebhookPayload {
  eventName?: string;
  sourceType?: string;
  loopName?: string;
  contactIdentity?: { email?: string };
  email?: { subject?: string };
}

/**
 * The event a webhook reports, or `undefined` for anything else — an event not listed in
 * `EMAIL_ACTIVITY`, a campaign, a contact with no address.
 *
 * Which email it was: a transactional email is the thank-you, the only one the site sends. A workflow
 * email is the reminder when its workflow name or subject mentions a reminder, and otherwise the
 * invitation — so name the reminder workflow in Loops with "reminder" in it (the subject already has
 * it). Loops does not track opens or clicks on transactional emails, so the thank-you only ever gets
 * delivered, bounced or marked as spam.
 */
export const emailActivityOf = (payload: unknown): EmailActivityEvent | undefined => {
  const event = (payload ?? {}) as LoopsWebhookPayload;
  const activity = ACTIVITY_BY_EVENT.get(event.eventName ?? '');
  const email = event.contactIdentity?.email?.trim().toLowerCase();
  if (!activity || !email) {
    return undefined;
  }
  if (event.sourceType === 'transactional') {
    return { activity, email, kind: 'thankYou' };
  }
  if (event.sourceType !== 'loop') {
    return undefined;
  }
  const label = `${event.loopName ?? ''} ${event.email?.subject ?? ''}`.toLowerCase();
  return { activity, email, kind: label.includes('remind') ? 'reminder' : 'invitation' };
};

/** The rank of what a cell already says — 0 for blank or anything the site did not write. */
const rankOf = (cell: string) => {
  const text = cell.trim().toLowerCase();
  const match = Object.values(EMAIL_ACTIVITY).find(({ label }) => text.startsWith(label.toLowerCase()));
  return match?.rank ?? 0;
};

/**
 * What to write into the guest's cell for this email, or `undefined` to leave it — "Sent 3 Oct", "Delivered 3 Oct",
 * "Opened 3 Oct", "Clicked 3 Oct", "Soft bounce 3 Oct", "Bounced 3 Oct", "Marked spam 3 Oct". The cell
 * only moves up `EMAIL_ACTIVITY`'s ranks: an open never replaces a click, and a repeat keeps the first
 * date.
 */
export const nextActivityCell = (current: string, activity: EmailActivity, at: Date): string | undefined => {
  const { label, rank } = EMAIL_ACTIVITY[activity];
  if (rank <= rankOf(current)) {
    return undefined;
  }
  const day = at.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', timeZone: 'Australia/Sydney' });
  return `${label} ${day}`;
};
