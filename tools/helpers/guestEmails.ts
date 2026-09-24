/*=============================================>>>>>
= Who an invitation or reminder may go to =
===============================================>>>>>*/

import type { Guest } from './guests';

export type GuestEmailKind = 'invitation' | 'reminder';

/** The Loops event each kind sends; a Loops workflow triggered by it sends the email. */
export const GUEST_EMAIL_EVENT: Record<GuestEmailKind, string> = {
  invitation: 'send_invitation',
  reminder: 'send_reminder'
};

/**
 * The invitation's opening paragraphs when Wedding Settings → Emails has none — the words the email
 * was written with.
 */
export const INVITATION_INTRO_DEFAULT = [
  'We’re getting married, and we’d love you to be there. Join us for a whole weekend at The Lodge Jamberoo, in the hills south of Sydney.',
  'Everyone stays on site and we’ve booked the rooms, so all you need to do is tell us you’re coming.'
];

/** How many paragraphs the invitation template has room for, one contact property each. */
export const INVITATION_INTRO_PARAGRAPHS = 3;

/**
 * The invitation's intro as the contact properties its template reads: `inviteIntro1` to
 * `inviteIntro3`, blank past the last paragraph. Paragraphs past the third are joined onto it rather
 * than dropped. Anything that is not text is ignored, and an intro with no text at all is the default.
 */
export const invitationIntroProperties = (intro: unknown): Record<string, string> => {
  const written = Array.isArray(intro)
    ? intro.filter((paragraph): paragraph is string => typeof paragraph === 'string').map((p) => p.trim())
    : [];
  const paragraphs = written.filter(Boolean);
  const chosen = paragraphs.length > 0 ? paragraphs : INVITATION_INTRO_DEFAULT;
  const last = INVITATION_INTRO_PARAGRAPHS - 1;
  const fitted = [...chosen.slice(0, last), chosen.slice(last).join(' ')];
  return Object.fromEntries(
    Array.from({ length: INVITATION_INTRO_PARAGRAPHS }, (_, index) => [`inviteIntro${index + 1}`, fitted[index] ?? ''])
  );
};

export type SkipReason =
  | 'no-email'
  | 'already-invited'
  | 'not-invited-yet'
  | 'already-replied'
  | 'shared-email'
  | 'already-sent';

/** How a skip reads in the Studio. */
export const SKIP_REASON_LABEL: Record<SkipReason, string> = {
  'already-invited': 'Already invited',
  'already-replied': 'Already replied',
  'already-sent': 'Already sent in this batch',
  'no-email': 'No email address',
  'not-invited-yet': 'Not invited yet',
  'shared-email': 'Shares an email address with another guest'
};

export interface Replies {
  /** Guest IDs with a reply in Sanity. */
  guestIds: ReadonlySet<string>;
  /** Email addresses with a reply in Sanity, lower-cased. */
  emails: ReadonlySet<string>;
}

export interface Eligibility {
  send: Guest[];
  skipped: { guest: Guest; reason: SkipReason }[];
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Whether a guest has replied, from every source that could know: the RSVP status the site writes
 * into their sheet row, and the replies in Sanity — by their guest ID, and by email address, for a
 * reply sent before they were signed in or from a browser without their cookie.
 */
export const hasReplied = (guest: Guest, replies: Replies) =>
  Boolean(guest.rsvpStatus.trim()) ||
  replies.guestIds.has(guest.id) ||
  replies.emails.has(guest.email.trim().toLowerCase());

/**
 * The guests an email of this kind may go to, and why each of the rest may not.
 *
 * - **Invitation:** never to a guest whose Invite sent cell is filled — an invitation goes once.
 * - **Reminder:** only to a guest who was invited, and never to one who has replied.
 * - **Both:** a valid email address; and only once per address, since the email service keys its
 *   contacts by address and two guests on one address would get one email with one guest's link.
 *
 * The sheet cells are written the moment each email goes, so a guest dropped from here by an earlier
 * send stays dropped even if the same send is published twice.
 */
export const eligibleFor = (kind: GuestEmailKind, guests: readonly Guest[], replies: Replies): Eligibility => {
  const send: Guest[] = [];
  const skipped: Eligibility['skipped'] = [];
  const addresses = new Map<string, number>();
  for (const guest of guests) {
    const address = guest.email.trim().toLowerCase();
    if (address) {
      addresses.set(address, (addresses.get(address) ?? 0) + 1);
    }
  }

  for (const guest of guests) {
    const address = guest.email.trim().toLowerCase();
    let reason: SkipReason | undefined;
    if (!EMAIL_PATTERN.test(address)) {
      reason = 'no-email';
    } else if ((addresses.get(address) ?? 0) > 1) {
      reason = 'shared-email';
    } else if (kind === 'invitation' && guest.inviteSent.trim()) {
      reason = 'already-invited';
    } else if (kind === 'reminder' && !guest.inviteSent.trim()) {
      reason = 'not-invited-yet';
    } else if (kind === 'reminder' && hasReplied(guest, replies)) {
      reason = 'already-replied';
    }

    if (reason) {
      skipped.push({ guest, reason });
    } else {
      send.push(guest);
    }
  }
  return { send, skipped };
};

/**
 * What has to be typed before a send to the guest list can go — "SEND INVITATIONS" or
 * "SEND REMINDERS". Checked in the Studio (the send cannot be published without it) and again by the
 * site before it emails anyone, so a send that reached the site some other way is refused too. A test
 * send, to one address, needs no phrase.
 */
export const sendConfirmationPhrase = (kind: GuestEmailKind) =>
  kind === 'invitation' ? 'SEND INVITATIONS' : 'SEND REMINDERS';

/** Whether a typed confirmation matches, ignoring case and extra spaces. */
export const isSendConfirmed = (kind: GuestEmailKind, typed?: string | null) =>
  (typed ?? '').trim().replaceAll(/\s+/g, ' ').toUpperCase() === sendConfirmationPhrase(kind);
