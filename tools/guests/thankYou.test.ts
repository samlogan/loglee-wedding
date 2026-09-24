import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Guest } from '@/helpers/guests';

vi.mock('./loops', () => ({ hasThankYouEmail: vi.fn(() => true), sendThankYouEmail: vi.fn(async () => undefined) }));
vi.mock('./replyExtras', () => ({ replyExtrasFor: vi.fn(async () => ({})) }));
vi.mock('./sheet', () => ({ guestHomeLinkFor: (id: string) => `https://samandlauren.wedding/g/${id}/?to=/` }));

const { sendThankYou, thankYouVariablesFor } = await import('./thankYou');
const loops = await import('./loops');
const extras = await import('./replyExtras');

const SAM: Guest = {
  email: 'sam@example.com',
  firstName: 'Sam',
  id: 'SAM-4821',
  inviteSent: '',
  lastName: 'Logan',
  nationality: 'British',
  nights: 2,
  payment: 'wise',
  perNight: 150,
  reminderSent: '',
  row: 2,
  rsvpStatus: '',
  stay: 'King Room'
};

const REPLY = { email: 'sam.l@example.com', kidsCount: 0, name: 'Sam Logan', plusOne: { bringing: false } };
const AT = new Date('2026-10-03T00:00:00Z');

const sent = () => vi.mocked(loops.sendThankYouEmail).mock.calls[0]?.[0];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(loops.hasThankYouEmail).mockReturnValue(true);
});

describe('sendThankYou', () => {
  it('goes to the address on the reply, with the guest’s stay and a per-reply key', async () => {
    await sendThankYou(SAM, REPLY, AT);
    expect(sent()).toMatchObject({ idempotencyKey: `thank-you-SAM-4821-${AT.getTime()}`, to: 'sam.l@example.com' });
    expect(sent()?.dataVariables).toMatchObject({
      firstName: 'Sam',
      homeLink: 'https://samandlauren.wedding/g/SAM-4821/?to=/',
      stay: [{ summary: 'King Room · 2 nights' }],
      stayTotal: [{ total: '$300' }]
    });
  });

  it('opens with the intro from Wedding Settings', async () => {
    vi.mocked(extras.replyExtrasFor).mockResolvedValue({ emailIntro: ['Thanks, legend.'] });
    await sendThankYou(SAM, REPLY, AT);
    expect(sent()?.dataVariables.intro).toEqual([{ text: 'Thanks, legend.' }]);
  });

  it('prices the Sunday night in when the guest took it', async () => {
    await sendThankYou(SAM, { ...REPLY, extraNight: true }, AT);
    expect(sent()?.dataVariables.stay).toEqual([{ summary: 'King Room · 3 nights, Sunday included' }]);
    expect(sent()?.dataVariables.stayTotal).toEqual([{ total: '$450' }]);
  });

  it('carries the payment details and travel note for this guest', async () => {
    const block = (text: string) =>
      ({
        _key: text,
        _type: 'block',
        children: [{ _key: 'a', _type: 'span', text }],
        markDefs: [],
        style: 'normal'
      }) as SanityTextBlock;
    vi.mocked(extras.replyExtrasFor).mockResolvedValue({
      payment: [block('Wise: sam@example.com')],
      travel: { content: [block('Bring an adaptor.')], title: 'Travelling from the UK' }
    });
    await sendThankYou(SAM, REPLY, AT);
    expect(extras.replyExtrasFor).toHaveBeenCalledWith(SAM);
    expect(sent()?.dataVariables).toMatchObject({
      payment: [{ text: 'Wise: sam@example.com' }],
      travel: [{ text: 'Bring an adaptor.' }],
      travelHeading: [{ text: 'Travelling from the UK' }]
    });
  });

  it('builds the same email for a Studio test, with the Sunday night when asked', async () => {
    const variables = await thankYouVariablesFor(SAM, { extraNight: true });
    expect(variables).toMatchObject({
      firstName: 'Sam',
      stay: [{ summary: 'King Room · 3 nights, Sunday included', total: '$450' }]
    });
    expect((await thankYouVariablesFor(SAM)).stay).toEqual([{ summary: 'King Room · 2 nights', total: '$300' }]);
  });

  it('sends nothing when the thank-you email is not set up', async () => {
    vi.mocked(loops.hasThankYouEmail).mockReturnValue(false);
    await sendThankYou(SAM, REPLY, AT);
    expect(loops.sendThankYouEmail).not.toHaveBeenCalled();
  });

  it('never throws — the reply is already saved', async () => {
    vi.mocked(loops.sendThankYouEmail).mockRejectedValue(new Error('Loops /transactional failed: 500'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(sendThankYou(SAM, REPLY, AT)).resolves.toBeUndefined();
  });
});
