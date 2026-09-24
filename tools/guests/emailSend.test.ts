import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Guest } from '@/helpers/guests';
import type { IGuestEmailSend } from '@/tools/sanity/schema/documents/guestEmailSend';

/*
 * The processor that decides whether real guests are emailed. Every collaborator — the Sanity write
 * client, the guest sheet, Loops — is replaced, so each test states a situation and checks who was
 * emailed and what was written back.
 */

const state = vi.hoisted(() => ({
  commits: [] as { id: string; ifRevisionId?: string; set: Record<string, unknown> }[],
  document: undefined as unknown,
  intro: undefined as unknown,
  lockConflict: false,
  replies: [] as { guestId?: string; email?: string }[]
}));

vi.mock('@/tools/sanity/lib/writeClient', () => ({
  default: {
    fetch: vi.fn(async (query: string) => (query.includes('invitationEmail') ? state.intro : state.replies)),
    getDocument: vi.fn(async () => state.document),
    patch: (id: string) => {
      const entry: { id: string; ifRevisionId?: string; set: Record<string, unknown> } = { id, set: {} };
      const chain = {
        commit: async () => {
          if (entry.ifRevisionId && state.lockConflict) {
            throw Object.assign(new Error('Revision mismatch'), { statusCode: 409 });
          }
          state.commits.push(entry);
          return {};
        },
        ifRevisionId: (rev: string) => {
          entry.ifRevisionId = rev;
          return chain;
        },
        set: (fields: Record<string, unknown>) => {
          Object.assign(entry.set, fields);
          return chain;
        }
      };
      return chain;
    }
  }
}));

vi.mock('./googleAuth', () => ({ hasGoogleCredentials: vi.fn(() => true) }));

vi.mock('./loops', () => ({
  ensureContactProperties: vi.fn(async () => undefined),
  hasLoopsKey: vi.fn(() => true),
  hasThankYouEmail: vi.fn(() => true),
  sendGuestEmail: vi.fn(async () => undefined),
  sendThankYouEmail: vi.fn(async () => undefined)
}));

vi.mock('./thankYou', () => ({
  thankYouVariablesFor: vi.fn(async (guest: Guest, options?: { extraNight?: boolean }) => ({
    extraNight: options?.extraNight ?? false,
    guestId: guest.id
  }))
}));

vi.mock('./sheet', () => ({
  markSent: vi.fn(async () => undefined),
  readGuests: vi.fn(async () => [] as Guest[]),
  sentColumn: vi.fn(async () => 10)
}));

const { processEmailSend } = await import('./emailSend');
const loops = await import('./loops');
const sheet = await import('./sheet');
const auth = await import('./googleAuth');

const guest = (id: string, overrides: Partial<Guest> = {}): Guest => ({
  email: `${id.toLowerCase()}@example.com`,
  firstName: id.split('-')[0],
  id,
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

const send = (fields: Partial<IGuestEmailSend>): IGuestEmailSend => ({
  _id: 'send-1',
  _rev: 'rev-1',
  _type: 'guestEmailSend',
  confirm: 'SEND INVITATIONS',
  kind: 'invitation',
  ...fields
});

/** Who Loops was asked to email, by guest ID and the address it went to. */
const emailed = () =>
  vi.mocked(loops.sendGuestEmail).mock.calls.map(([, recipient, options]) => ({
    id: recipient.id,
    to: options.to ?? recipient.email
  }));

/** The last write back to the send document. */
const lastWrite = () => state.commits.at(-1)?.set ?? {};

beforeEach(() => {
  vi.clearAllMocks();
  state.commits = [];
  state.lockConflict = false;
  state.replies = [];
  state.document = undefined;
  state.intro = undefined;
  vi.mocked(auth.hasGoogleCredentials).mockReturnValue(true);
  vi.mocked(loops.hasLoopsKey).mockReturnValue(true);
  vi.mocked(loops.hasThankYouEmail).mockReturnValue(true);
});

describe('what it will not touch', () => {
  it('ignores a draft, which has not been published and so has not been asked to send', async () => {
    await processEmailSend('drafts.send-1');
    expect(state.commits).toEqual([]);
    expect(loops.sendGuestEmail).not.toHaveBeenCalled();
  });

  it('ignores a send that is finished or failed', async () => {
    for (const status of ['done', 'failed'] as const) {
      state.document = send({ status });
      await processEmailSend('send-1');
    }
    expect(state.commits).toEqual([]);
    expect(loops.sendGuestEmail).not.toHaveBeenCalled();
  });

  it('leaves a send another call is working on, while its lock is fresh', async () => {
    state.document = send({ lockedAt: new Date().toISOString(), status: 'sending' });
    await processEmailSend('send-1');
    expect(state.commits).toEqual([]);
  });

  it('takes over a send whose lock has gone stale, as a call that died mid-batch leaves it', async () => {
    state.document = send({ lockedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(), status: 'sending' });
    vi.mocked(sheet.readGuests).mockResolvedValue([guest('SAM-1')]);
    await processEmailSend('send-1');
    expect(emailed()).toEqual([{ id: 'SAM-1', to: 'sam-1@example.com' }]);
  });

  it('sends nothing when another call took the lock first', async () => {
    state.document = send({});
    state.lockConflict = true;
    vi.mocked(sheet.readGuests).mockResolvedValue([guest('SAM-1')]);
    await processEmailSend('send-1');
    expect(loops.sendGuestEmail).not.toHaveBeenCalled();
  });
});

describe('the lock', () => {
  it('is taken against the revision it read, before anything is sent', async () => {
    state.document = send({});
    vi.mocked(sheet.readGuests).mockResolvedValue([guest('SAM-1')]);
    await processEmailSend('send-1');
    expect(state.commits[0]).toMatchObject({ ifRevisionId: 'rev-1', set: { status: 'sending' } });
  });
});

describe('a test send', () => {
  it('goes to the test address only, with the first guest’s details, and emails no guest', async () => {
    state.document = send({ confirm: undefined, testEmail: 'me@example.com' });
    vi.mocked(sheet.readGuests).mockResolvedValue([guest('SAM-1'), guest('LAUREN-2')]);
    await processEmailSend('send-1');

    expect(emailed()).toEqual([{ id: 'SAM-1', to: 'me@example.com' }]);
    expect(sheet.markSent).not.toHaveBeenCalled();
    expect(lastWrite()).toMatchObject({ status: 'done' });
    expect(String(lastWrite().summary)).toContain('No guest was emailed');
  });
});

describe('a test as a chosen guest', () => {
  it('is filled in with the guest whose ID is given, however it is typed', async () => {
    state.document = send({ confirm: undefined, testEmail: 'me@example.com', testGuestId: ' lauren-2 ' });
    vi.mocked(sheet.readGuests).mockResolvedValue([guest('SAM-1'), guest('LAUREN-2')]);
    await processEmailSend('send-1');
    expect(emailed()).toEqual([{ id: 'LAUREN-2', to: 'me@example.com' }]);
  });

  it('fails, emailing nobody, when no guest has that ID', async () => {
    state.document = send({ confirm: undefined, testEmail: 'me@example.com', testGuestId: 'NOBODY-9' });
    vi.mocked(sheet.readGuests).mockResolvedValue([guest('SAM-1')]);
    await processEmailSend('send-1');
    expect(loops.sendGuestEmail).not.toHaveBeenCalled();
    expect(lastWrite()).toMatchObject({ status: 'failed' });
  });
});

describe('a thank-you test', () => {
  const thankYouSent = () => vi.mocked(loops.sendThankYouEmail).mock.calls.map(([options]) => options);

  it('goes to the test address with the chosen guest’s details, Sunday night and all', async () => {
    state.document = send({
      confirm: undefined,
      kind: 'thankYou',
      testEmail: 'me@example.com',
      testExtraNight: true,
      testGuestId: 'LAUREN-2'
    });
    vi.mocked(sheet.readGuests).mockResolvedValue([guest('SAM-1'), guest('LAUREN-2')]);
    await processEmailSend('send-1');

    expect(thankYouSent()).toEqual([
      expect.objectContaining({ dataVariables: { extraNight: true, guestId: 'LAUREN-2' }, to: 'me@example.com' })
    ]);
    expect(loops.sendGuestEmail).not.toHaveBeenCalled();
    expect(sheet.markSent).not.toHaveBeenCalled();
    expect(lastWrite()).toMatchObject({ status: 'done' });
  });

  it('is never sent to the guest list', async () => {
    state.document = send({ confirm: 'SEND INVITATIONS', kind: 'thankYou' });
    vi.mocked(sheet.readGuests).mockResolvedValue([guest('SAM-1')]);
    await processEmailSend('send-1');

    expect(loops.sendThankYouEmail).not.toHaveBeenCalled();
    expect(lastWrite()).toMatchObject({ status: 'failed' });
  });

  it('fails with a message when the site has no thank-you email set up', async () => {
    state.document = send({ confirm: undefined, kind: 'thankYou', testEmail: 'me@example.com' });
    vi.mocked(loops.hasThankYouEmail).mockReturnValue(false);
    vi.mocked(sheet.readGuests).mockResolvedValue([guest('SAM-1')]);
    await processEmailSend('send-1');

    expect(loops.sendThankYouEmail).not.toHaveBeenCalled();
    expect(lastWrite()).toMatchObject({ status: 'failed' });
  });
});

describe('the confirmation', () => {
  it('refuses a guest-list send without the typed phrase, and emails nobody', async () => {
    state.document = send({ confirm: undefined });
    vi.mocked(sheet.readGuests).mockResolvedValue([guest('SAM-1')]);
    await processEmailSend('send-1');

    expect(loops.sendGuestEmail).not.toHaveBeenCalled();
    expect(lastWrite()).toMatchObject({ status: 'failed' });
    expect(String(lastWrite().summary)).toContain('SEND INVITATIONS');
  });

  it('refuses the other kind’s phrase', async () => {
    state.document = send({ confirm: 'SEND INVITATIONS', kind: 'reminder' });
    vi.mocked(sheet.readGuests).mockResolvedValue([guest('SAM-1', { inviteSent: 'Invite sent 1 Oct' })]);
    await processEmailSend('send-1');
    expect(loops.sendGuestEmail).not.toHaveBeenCalled();
  });
});

describe('an invitation', () => {
  it('goes to guests not yet invited, never to one who was, and marks each in the sheet', async () => {
    state.document = send({});
    vi.mocked(sheet.readGuests).mockResolvedValue([
      guest('SAM-1'),
      guest('LAUREN-2', { inviteSent: 'Invite sent 1 Oct' }),
      guest('ALEX-3')
    ]);
    await processEmailSend('send-1');

    expect(emailed().map(({ id }) => id)).toEqual(['SAM-1', 'ALEX-3']);
    expect(vi.mocked(sheet.markSent).mock.calls.map(([marked]) => marked.id)).toEqual(['SAM-1', 'ALEX-3']);
    expect(lastWrite()).toMatchObject({ sent: ['SAM-1', 'ALEX-3'], status: 'done' });
    expect(lastWrite().skipped).toEqual([expect.objectContaining({ guestId: 'LAUREN-2', reason: 'Already invited' })]);
  });

  it('carries the intro from Wedding Settings, for the template to show', async () => {
    state.document = send({});
    state.intro = ['Come to our wedding.'];
    vi.mocked(sheet.readGuests).mockResolvedValue([guest('SAM-1')]);
    await processEmailSend('send-1');
    expect(vi.mocked(loops.sendGuestEmail).mock.calls[0][2].properties).toEqual({
      inviteIntro1: 'Come to our wedding.',
      inviteIntro2: '',
      inviteIntro3: ''
    });
  });

  it('carries a per-guest idempotency key, so no two sends can invite anyone twice', async () => {
    state.document = send({});
    vi.mocked(sheet.readGuests).mockResolvedValue([guest('SAM-1')]);
    await processEmailSend('send-1');
    expect(vi.mocked(loops.sendGuestEmail).mock.calls[0][2].idempotencyKey).toBe('invitation-SAM-1');
  });

  it('sends ten at a time, handing back to "requested" so the webhook fires the next batch', async () => {
    state.document = send({});
    vi.mocked(sheet.readGuests).mockResolvedValue(Array.from({ length: 12 }, (_, index) => guest(`G-${index}`)));
    await processEmailSend('send-1');

    expect(loops.sendGuestEmail).toHaveBeenCalledTimes(10);
    expect(lastWrite()).toMatchObject({ status: 'requested' });
    expect(lastWrite().sent).toHaveLength(10);
  });

  it('picks up where the last batch stopped, without re-sending anyone already reached', async () => {
    const first = Array.from({ length: 10 }, (_, index) => `G-${index}`);
    state.document = send({ sent: first, status: 'requested' });
    vi.mocked(sheet.readGuests).mockResolvedValue(Array.from({ length: 12 }, (_, index) => guest(`G-${index}`)));
    await processEmailSend('send-1');

    expect(emailed().map(({ id }) => id)).toEqual(['G-10', 'G-11']);
    expect(lastWrite()).toMatchObject({ status: 'done' });
    expect(lastWrite().sent).toHaveLength(12);
  });

  it('records a guest Loops refused and carries on with the rest', async () => {
    state.document = send({});
    vi.mocked(sheet.readGuests).mockResolvedValue([guest('SAM-1'), guest('ALEX-3')]);
    vi.mocked(loops.sendGuestEmail).mockImplementation(async (_kind, recipient) => {
      if (recipient.id === 'SAM-1') {
        throw new Error('Loops /events/send failed: 500');
      }
    });
    await processEmailSend('send-1');

    expect(sheet.markSent).toHaveBeenCalledTimes(1);
    expect(lastWrite()).toMatchObject({ sent: ['ALEX-3'], status: 'done' });
    expect(lastWrite().failed).toEqual([expect.objectContaining({ guestId: 'SAM-1' })]);
  });
});

describe('a reminder', () => {
  it('never goes to a guest who has replied — by sheet, or by a reply in Sanity — or was never invited', async () => {
    state.document = send({ confirm: 'SEND REMINDERS', kind: 'reminder' });
    state.replies = [{ email: 'alex-3@example.com' }];
    vi.mocked(sheet.readGuests).mockResolvedValue([
      guest('SAM-1', { inviteSent: 'Invite sent 1 Oct' }),
      guest('LAUREN-2', { inviteSent: 'Invite sent 1 Oct', rsvpStatus: 'Replied 3 Oct' }),
      guest('ALEX-3', { inviteSent: 'Invite sent 1 Oct' }),
      guest('JO-4')
    ]);
    await processEmailSend('send-1');

    expect(emailed().map(({ id }) => id)).toEqual(['SAM-1']);
    const reasons = Object.fromEntries(
      (lastWrite().skipped as { guestId: string; reason: string }[]).map(({ guestId, reason }) => [guestId, reason])
    );
    expect(reasons).toEqual({ 'ALEX-3': 'Already replied', 'JO-4': 'Not invited yet', 'LAUREN-2': 'Already replied' });
  });

  it('is not sent twice to one guest within a send, though the sheet does not stop repeats', async () => {
    state.document = send({ confirm: 'SEND REMINDERS', kind: 'reminder', sent: ['SAM-1'], status: 'requested' });
    vi.mocked(sheet.readGuests).mockResolvedValue([
      guest('SAM-1', { inviteSent: 'Invite sent 1 Oct', reminderSent: 'Reminder sent 5 Oct' })
    ]);
    await processEmailSend('send-1');
    expect(loops.sendGuestEmail).not.toHaveBeenCalled();
  });
});

describe('when the site is not set up to send', () => {
  it('fails with a message, and emails nobody', async () => {
    state.document = send({});
    vi.mocked(loops.hasLoopsKey).mockReturnValue(false);
    await processEmailSend('send-1');

    expect(loops.sendGuestEmail).not.toHaveBeenCalled();
    expect(lastWrite()).toMatchObject({ status: 'failed' });
  });
});
