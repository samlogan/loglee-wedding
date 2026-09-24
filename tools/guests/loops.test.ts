import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Guest } from '@/helpers/guests';

vi.mock('./sheet', () => ({
  guestHomeLinkFor: (id: string) => `https://samandlauren.wedding/g/${id}/?to=/`,
  guestLinkFor: (id: string) => `https://samandlauren.wedding/g/${id}/`
}));

const { ensureContactProperties, hasLoopsKey, hasThankYouEmail, sendGuestEmail, sendThankYouEmail } =
  await import('./loops');
const { thankYouVariables } = await import('@/helpers/thankYouEmail');

const SAM: Guest = {
  email: 'sam@example.com',
  firstName: 'Sam',
  id: 'SAM-4821',
  inviteSent: '',
  lastName: 'Logan',
  nationality: '',
  nights: 2,
  payment: 'au',
  perNight: 150,
  reminderSent: '',
  row: 2,
  rsvpStatus: '',
  stay: 'King Room'
};

/** A stand-in for the Loops API, answering every request with one status and body. */
const stubLoops = (respond: (url: string) => { status: number; body: unknown }) => {
  const spy = vi.fn(async (url: string, _init?: RequestInit) => {
    const { body, status } = respond(url);
    return { json: async () => body, ok: status < 300, status } as unknown as Response;
  });
  vi.stubGlobal('fetch', spy);
  return spy;
};

const bodyOf = (call: [string, RequestInit?]) => JSON.parse(String(call[1]?.body));

beforeEach(() => {
  vi.stubEnv('LOOP_API_KEY', 'loops-key');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('hasLoopsKey', () => {
  it('reads LOOP_API_KEY, or LOOPS_API_KEY', () => {
    expect(hasLoopsKey()).toBe(true);
    vi.stubEnv('LOOP_API_KEY', '');
    expect(hasLoopsKey()).toBe(false);
    vi.stubEnv('LOOPS_API_KEY', 'other');
    expect(hasLoopsKey()).toBe(true);
  });
});

describe('ensureContactProperties', () => {
  it('creates only the properties Loops does not have yet', async () => {
    const spy = stubLoops((url) =>
      url.endsWith('?list=custom')
        ? { body: [{ key: 'guestId' }, { key: 'rsvpLink' }], status: 200 }
        : { body: { success: true }, status: 200 }
    );
    await ensureContactProperties();

    const created = spy.mock.calls
      .filter(([, init]) => (init as RequestInit)?.method === 'POST')
      .map((call) => bodyOf(call).name);
    expect(created).toEqual([
      'homeLink',
      'stayOption',
      'nights',
      'contributionTotal',
      'inviteIntro1',
      'inviteIntro2',
      'inviteIntro3'
    ]);
  });
});

describe('sendGuestEmail', () => {
  it('sends the kind’s event with the guest’s details and an idempotency key', async () => {
    const spy = stubLoops(() => ({ body: { success: true }, status: 200 }));
    await sendGuestEmail('invitation', SAM, { idempotencyKey: 'invitation-SAM-4821' });

    const [url, init] = spy.mock.calls[0];
    expect(url).toBe('https://app.loops.so/api/v1/events/send');
    expect(init?.headers).toMatchObject({
      authorization: 'Bearer loops-key',
      'Idempotency-Key': 'invitation-SAM-4821'
    });
    expect(bodyOf(spy.mock.calls[0])).toEqual({
      contributionTotal: 300,
      email: 'sam@example.com',
      eventName: 'send_invitation',
      firstName: 'Sam',
      guestId: 'SAM-4821',
      homeLink: 'https://samandlauren.wedding/g/SAM-4821/?to=/',
      lastName: 'Logan',
      nights: 2,
      rsvpLink: 'https://samandlauren.wedding/g/SAM-4821/',
      stayOption: 'King Room'
    });
  });

  it('sends a reminder as its own event, and to a test address when given one', async () => {
    const spy = stubLoops(() => ({ body: { success: true }, status: 200 }));
    await sendGuestEmail('reminder', SAM, { idempotencyKey: 'test', to: 'me@example.com' });
    expect(bodyOf(spy.mock.calls[0])).toMatchObject({
      email: 'me@example.com',
      eventName: 'send_reminder',
      guestId: 'SAM-4821'
    });
  });

  it('leaves out the stay when the guest has none, rather than sending blanks', async () => {
    const spy = stubLoops(() => ({ body: { success: true }, status: 200 }));
    await sendGuestEmail(
      'invitation',
      { ...SAM, nights: undefined, perNight: undefined, stay: '' },
      { idempotencyKey: 'k' }
    );
    expect(bodyOf(spy.mock.calls[0])).not.toHaveProperty('stayOption');
    expect(bodyOf(spy.mock.calls[0])).not.toHaveProperty('contributionTotal');
  });

  it('adds the email’s own properties — the invitation’s intro — to the guest’s', async () => {
    const spy = stubLoops(() => ({ body: { success: true }, status: 200 }));
    await sendGuestEmail('invitation', SAM, { idempotencyKey: 'k', properties: { inviteIntro1: 'Hello' } });
    expect(bodyOf(spy.mock.calls[0])).toMatchObject({ guestId: 'SAM-4821', inviteIntro1: 'Hello' });
  });

  it('treats a repeated idempotency key (409) as sent — the email already went', async () => {
    stubLoops(() => ({ body: { message: 'Duplicate request' }, status: 409 }));
    await expect(sendGuestEmail('invitation', SAM, { idempotencyKey: 'k' })).resolves.toBeUndefined();
  });

  it('throws on any other failure, with Loops’s message', async () => {
    stubLoops(() => ({ body: { message: 'Invalid API key' }, status: 401 }));
    await expect(sendGuestEmail('invitation', SAM, { idempotencyKey: 'k' })).rejects.toThrow('Invalid API key');
  });
});

describe('sendThankYouEmail', () => {
  it('is only sent once Loops has the key and the transactional email’s ID', () => {
    expect(hasThankYouEmail()).toBe(false);
    vi.stubEnv('LOOPS_THANK_YOU_ID', 'thank-you-id');
    expect(hasThankYouEmail()).toBe(true);
  });

  it('sends the transactional email with the guest’s variables and an idempotency key', async () => {
    vi.stubEnv('LOOPS_THANK_YOU_ID', 'thank-you-id');
    const spy = stubLoops(() => ({ body: { success: true }, status: 200 }));
    const dataVariables = thankYouVariables({ firstName: 'Sam', homeLink: 'https://samandlauren.wedding/' });
    await sendThankYouEmail({ dataVariables, idempotencyKey: 'thank-you-SAM-4821', to: 'sam@example.com' });

    const [url, init] = spy.mock.calls[0];
    expect(url).toBe('https://app.loops.so/api/v1/transactional');
    expect(init?.headers).toMatchObject({ 'Idempotency-Key': 'thank-you-SAM-4821' });
    expect(bodyOf(spy.mock.calls[0])).toEqual({
      dataVariables,
      email: 'sam@example.com',
      transactionalId: 'thank-you-id'
    });
  });
});
