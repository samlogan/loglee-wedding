import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  params: undefined as Record<string, unknown> | undefined,
  result: null as unknown
}));

vi.mock('@/tools/sanity/lib/fetch', () => ({
  sanityFetch: vi.fn(async ({ params }: { params: Record<string, unknown> }) => {
    state.params = params;
    return state.result;
  })
}));

const { replyExtrasFor } = await import('./replyExtras');

const block = (text: string) =>
  ({
    _key: text,
    _type: 'block',
    children: [{ _key: 'a', _type: 'span', text }],
    markDefs: [],
    style: 'normal'
  }) as SanityTextBlock;

const PAYMENT = { australia: [block('BSB 062 000')], international: [block('Wise')] };

beforeEach(() => {
  state.result = null;
  state.params = undefined;
});

describe('replyExtrasFor', () => {
  it('gives an Australian guest the Australian account, and no travel note', async () => {
    state.result = { payment: PAYMENT, travel: null };
    expect(await replyExtrasFor({ nationality: '', payment: 'au' })).toEqual({
      emailIntro: undefined,
      payment: PAYMENT.australia,
      travel: undefined
    });
    expect(state.params).toEqual({ noteId: '' });
  });

  it('gives everyone else Wise, and asks for the note for their nationality', async () => {
    state.result = { payment: PAYMENT, travel: { content: [block('Bring an adaptor.')], title: 'From the UK' } };
    expect(await replyExtrasFor({ nationality: 'British', payment: 'wise' })).toEqual({
      emailIntro: undefined,
      payment: PAYMENT.international,
      travel: { content: [block('Bring an adaptor.')], title: 'From the UK' }
    });
    expect(state.params).toEqual({ noteId: 'nationalityNote-uk' });
  });

  it('gives a guest their own country’s payment details when it has them', async () => {
    state.result = {
      payment: PAYMENT,
      travel: {
        content: [block('Bring an adaptor.')],
        paymentDetails: [block('UK account: 12-34-56')],
        title: 'From the UK'
      }
    };
    expect((await replyExtrasFor({ nationality: 'British', payment: 'wise' })).payment).toEqual([
      block('UK account: 12-34-56')
    ]);
  });

  it('falls back to the international details when their country has none', async () => {
    state.result = { payment: PAYMENT, travel: { content: [block('Bring an adaptor.')], paymentDetails: [] } };
    expect((await replyExtrasFor({ nationality: 'British', payment: 'wise' })).payment).toEqual(PAYMENT.international);
  });

  it('uses the country’s payment details even with no travel note written', async () => {
    state.result = { payment: PAYMENT, travel: { content: [], paymentDetails: [block('USD account')] } };
    expect(await replyExtrasFor({ nationality: 'American', payment: 'wise' })).toMatchObject({
      payment: [block('USD account')],
      travel: undefined
    });
  });

  it('shows nothing that has not been written yet', async () => {
    state.result = { payment: { australia: [] }, travel: { content: [], title: 'From the US' } };
    expect(await replyExtrasFor({ nationality: 'American', payment: 'au' })).toEqual({
      emailIntro: undefined,
      payment: undefined,
      travel: undefined
    });
  });

  it('carries the thank-you email’s intro', async () => {
    state.result = { emailIntro: ['Thanks!'] };
    expect((await replyExtrasFor({ nationality: '', payment: 'au' })).emailIntro).toEqual(['Thanks!']);
  });
});
