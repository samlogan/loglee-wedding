import { describe, expect, it } from 'vitest';

import { eligibleFor, hasReplied, isSendConfirmed, sendConfirmationPhrase } from './guestEmails';
import type { Replies } from './guestEmails';
import type { Guest } from './guests';

const guest = (overrides: Partial<Guest>): Guest => ({
  email: 'guest@example.com',
  firstName: 'Guest',
  id: 'GUEST-1000',
  inviteSent: '',
  lastName: '',
  nationality: '',
  payment: 'au',
  reminderSent: '',
  row: 2,
  rsvpStatus: '',
  stay: '',
  ...overrides
});

const NO_REPLIES: Replies = { emails: new Set(), guestIds: new Set() };

const ids = (guests: Guest[]) => guests.map((entry) => entry.id);
const reasons = (result: ReturnType<typeof eligibleFor>) =>
  Object.fromEntries(result.skipped.map(({ guest: skipped, reason }) => [skipped.id, reason]));

describe('invitations', () => {
  it('go to every guest with an email who has not been invited', () => {
    const result = eligibleFor(
      'invitation',
      [guest({ email: 'a@example.com', id: 'A-1' }), guest({ email: 'b@example.com', id: 'B-1' })],
      NO_REPLIES
    );
    expect(ids(result.send)).toEqual(['A-1', 'B-1']);
  });

  it('never go to a guest who has already been invited', () => {
    const result = eligibleFor(
      'invitation',
      [
        guest({ email: 'a@example.com', id: 'A-1', inviteSent: 'Invite sent 24 Sept' }),
        guest({ email: 'b@example.com', id: 'B-1' })
      ],
      NO_REPLIES
    );
    expect(ids(result.send)).toEqual(['B-1']);
    expect(reasons(result)).toEqual({ 'A-1': 'already-invited' });
  });

  it('go to a guest who has replied but was never invited — they still get their invitation', () => {
    const result = eligibleFor('invitation', [guest({ id: 'A-1', rsvpStatus: 'Replied 24 Sept' })], NO_REPLIES);
    expect(ids(result.send)).toEqual(['A-1']);
  });
});

describe('reminders', () => {
  const invited = (overrides: Partial<Guest>) => guest({ inviteSent: 'Invite sent 24 Sept', ...overrides });

  it('go to invited guests who have not replied', () => {
    const result = eligibleFor('reminder', [invited({ id: 'A-1' })], NO_REPLIES);
    expect(ids(result.send)).toEqual(['A-1']);
  });

  it('never go to a guest whose sheet row says they replied', () => {
    const result = eligibleFor('reminder', [invited({ id: 'A-1', rsvpStatus: 'Replied 24 Sept' })], NO_REPLIES);
    expect(result.send).toEqual([]);
    expect(reasons(result)).toEqual({ 'A-1': 'already-replied' });
  });

  it('never go to a guest with a reply in Sanity, by guest ID or by email, even if the sheet missed it', () => {
    const replies: Replies = { emails: new Set(['b@example.com']), guestIds: new Set(['A-1']) };
    const result = eligibleFor(
      'reminder',
      [
        invited({ email: 'a@example.com', id: 'A-1' }),
        invited({ email: 'B@Example.com', id: 'B-1' }),
        invited({ email: 'c@example.com', id: 'C-1' })
      ],
      replies
    );
    expect(ids(result.send)).toEqual(['C-1']);
    expect(reasons(result)).toEqual({ 'A-1': 'already-replied', 'B-1': 'already-replied' });
  });

  it('never go to a guest who was never invited', () => {
    const result = eligibleFor('reminder', [guest({ id: 'A-1' })], NO_REPLIES);
    expect(reasons(result)).toEqual({ 'A-1': 'not-invited-yet' });
  });

  it('can go more than once — a second reminder is allowed, only a reply stops them', () => {
    const result = eligibleFor('reminder', [invited({ id: 'A-1', reminderSent: 'Reminder sent 1 Nov' })], NO_REPLIES);
    expect(ids(result.send)).toEqual(['A-1']);
  });
});

describe('every email', () => {
  it('skips a guest without a usable email address', () => {
    const result = eligibleFor(
      'invitation',
      [guest({ email: '', id: 'A-1' }), guest({ email: 'nope', id: 'B-1' })],
      NO_REPLIES
    );
    expect(reasons(result)).toEqual({ 'A-1': 'no-email', 'B-1': 'no-email' });
  });

  it('skips guests who share an address, rather than send one email with one guest’s link', () => {
    const result = eligibleFor(
      'invitation',
      [guest({ email: 'home@example.com', id: 'A-1' }), guest({ email: 'Home@example.com ', id: 'B-1' })],
      NO_REPLIES
    );
    expect(result.send).toEqual([]);
    expect(reasons(result)).toEqual({ 'A-1': 'shared-email', 'B-1': 'shared-email' });
  });
});

describe('hasReplied', () => {
  it('reads the sheet and both kinds of Sanity reply', () => {
    expect(hasReplied(guest({ rsvpStatus: 'Replied' }), NO_REPLIES)).toBe(true);
    expect(hasReplied(guest({ id: 'A-1' }), { emails: new Set(), guestIds: new Set(['A-1']) })).toBe(true);
    expect(hasReplied(guest({ email: 'X@y.com' }), { emails: new Set(['x@y.com']), guestIds: new Set() })).toBe(true);
    expect(hasReplied(guest({}), NO_REPLIES)).toBe(false);
  });
});

describe('send confirmation', () => {
  it('asks for a phrase naming what will be sent', () => {
    expect(sendConfirmationPhrase('invitation')).toBe('SEND INVITATIONS');
    expect(sendConfirmationPhrase('reminder')).toBe('SEND REMINDERS');
  });

  it('accepts the phrase in any case and spacing', () => {
    expect(isSendConfirmed('invitation', 'send invitations')).toBe(true);
    expect(isSendConfirmed('invitation', '  Send   Invitations ')).toBe(true);
    expect(isSendConfirmed('reminder', 'SEND REMINDERS')).toBe(true);
  });

  it('refuses a blank, a wrong or the other kind’s phrase', () => {
    expect(isSendConfirmed('invitation', '')).toBe(false);
    expect(isSendConfirmed('invitation', undefined)).toBe(false);
    expect(isSendConfirmed('invitation', 'send')).toBe(false);
    expect(isSendConfirmed('invitation', 'SEND REMINDERS')).toBe(false);
    expect(isSendConfirmed('reminder', 'SEND INVITATIONS')).toBe(false);
  });
});
