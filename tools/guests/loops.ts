import 'server-only';
import { GUEST_EMAIL_EVENT } from '@/helpers/guestEmails';
import type { GuestEmailKind } from '@/helpers/guestEmails';
import { stayPriceOf } from '@/helpers/guests';
import type { Guest } from '@/helpers/guests';
import type { ThankYouEmailVariables } from '@/helpers/thankYouEmail';

import { guestHomeLinkFor, guestLinkFor } from './sheet';

/**
 * Loops, the email service. The site never sends email itself: it sends Loops an *event* per guest
 * (`send_invitation`, `send_reminder`), and a Loops workflow triggered by that event sends the email
 * designed in Loops's editor. Workflow emails, unlike Loops's transactional ones, are tracked — opens
 * and clicks show in Loops.
 *
 * The guest's details travel as contact properties, so an email can use `{contact.firstName}`,
 * `{contact.rsvpLink}`, `{contact.homeLink}` (the same sign-in, landing on the homepage), `{contact.guestId}`, `{contact.stayOption}`, `{contact.nights}` and
 * `{contact.contributionTotal}`.
 */
const API = 'https://app.loops.so/api/v1';

// `||`, not `??`: `.env.template` ships `LOOP_API_KEY=""`, and an empty string must not hide the other name.
const apiKey = () => process.env.LOOP_API_KEY || process.env.LOOPS_API_KEY;

export const hasLoopsKey = () => Boolean(apiKey());

const loops = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API}${path}`, {
    ...init,
    cache: 'no-store',
    headers: { authorization: `Bearer ${apiKey()}`, 'content-type': 'application/json', ...init?.headers }
  });
  const body = (await response.json().catch(() => ({}))) as T & { message?: string };
  // 409 is Loops refusing a repeated Idempotency-Key: the email already went, which is success here.
  if (!response.ok && response.status !== 409) {
    throw new Error(`Loops ${path} failed: ${response.status} ${body.message ?? ''}`.trim());
  }
  return body;
};

/** The custom contact properties the emails use. Created in Loops on first send if missing. */
const CONTACT_PROPERTIES: { name: string; type: 'string' | 'number' }[] = [
  { name: 'guestId', type: 'string' },
  { name: 'rsvpLink', type: 'string' },
  { name: 'homeLink', type: 'string' },
  { name: 'stayOption', type: 'string' },
  { name: 'nights', type: 'number' },
  { name: 'contributionTotal', type: 'number' },
  // The invitation's intro, from Wedding Settings → Emails — see `invitationIntroProperties`.
  { name: 'inviteIntro1', type: 'string' },
  { name: 'inviteIntro2', type: 'string' },
  { name: 'inviteIntro3', type: 'string' }
];

export const ensureContactProperties = async () => {
  const existing = await loops<{ key: string }[]>('/contacts/properties?list=custom');
  const have = new Set(existing.map((property) => property.key));
  for (const property of CONTACT_PROPERTIES.filter(({ name }) => !have.has(name))) {
    await loops('/contacts/properties', { body: JSON.stringify(property), method: 'POST' });
  }
};

const contactPropertiesOf = (guest: Guest) => {
  const stay = stayPriceOf(guest);
  return {
    firstName: guest.firstName,
    guestId: guest.id,
    lastName: guest.lastName,
    homeLink: guestHomeLinkFor(guest.id),
    rsvpLink: guestLinkFor(guest.id),
    ...(stay ? { contributionTotal: stay.total, nights: stay.nights, stayOption: stay.stay } : {})
  };
};

/**
 * Send one guest's email. `to` overrides the address — for a test send, which goes to you with this
 * guest's details. `idempotencyKey` stops Loops sending twice for a request that is retried.
 * `properties` are extra contact properties for this email — the invitation's intro.
 */
export const sendGuestEmail = async (
  kind: GuestEmailKind,
  guest: Guest,
  { idempotencyKey, properties, to }: { idempotencyKey: string; properties?: Record<string, string>; to?: string }
) => {
  await loops('/events/send', {
    body: JSON.stringify({
      email: to ?? guest.email,
      eventName: GUEST_EMAIL_EVENT[kind],
      ...contactPropertiesOf(guest),
      ...properties
    }),
    headers: { 'Idempotency-Key': idempotencyKey.slice(0, 100) },
    method: 'POST'
  });
};

/**
 * The Loops transactional email sent after a guest's RSVP is saved — its ID from Loops (Transactional
 * → the email → Publish), in `LOOPS_THANK_YOU_ID`. Unset, no thank-you email is sent.
 */
const thankYouId = () => process.env.LOOPS_THANK_YOU_ID;

export const hasThankYouEmail = () => Boolean(apiKey() && thankYouId());

/**
 * Send the thank-you email. Transactional rather than an event, because what it says — the guest's
 * stay, their payment details, their travel note — is built per guest from Sanity, and only a
 * transactional email takes arrays (`thankYouVariables`). Loops does not track opens on these; nothing
 * here needs it to.
 */
export const sendThankYouEmail = async ({
  dataVariables,
  idempotencyKey,
  to
}: {
  dataVariables: ThankYouEmailVariables;
  idempotencyKey: string;
  to: string;
}) => {
  await loops('/transactional', {
    body: JSON.stringify({ dataVariables, email: to, transactionalId: thankYouId() }),
    headers: { 'Idempotency-Key': idempotencyKey.slice(0, 100) },
    method: 'POST'
  });
};
