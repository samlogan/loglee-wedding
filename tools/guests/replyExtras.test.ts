import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  extraNight: null as unknown,
  params: undefined as Record<string, unknown> | undefined,
  result: null as unknown
}));

vi.mock('@/tools/sanity/lib/fetch', () => ({
  sanityFetch: vi.fn(async ({ params }: { params: Record<string, unknown> }) => {
    state.params = params;
    return state.result;
  })
}));

vi.mock('@/tools/sanity/lib/writeClient', () => ({
  default: { fetch: vi.fn(async () => state.extraNight) }
}));

const { replyExtrasFor, savedStayOf } = await import('./replyExtras');

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
  state.extraNight = null;
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

describe('savedStayOf', () => {
  it('reads whether the saved reply is staying, and takes the Sunday night', async () => {
    state.extraNight = { extraNight: true, staying: true };
    expect(await savedStayOf('SAM-1')).toEqual({ extraNight: true, staying: true });
    state.extraNight = { extraNight: false, staying: false };
    expect(await savedStayOf('SAM-1')).toEqual({ extraNight: false, staying: false });
  });

  it('takes no Sunday night for a guest who is not staying, whatever is stored', async () => {
    state.extraNight = { extraNight: true, staying: false };
    expect(await savedStayOf('SAM-1')).toEqual({ extraNight: false, staying: false });
  });

  it('is staying when the reply predates the question, or there is no reply', async () => {
    state.extraNight = { extraNight: true };
    expect(await savedStayOf('SAM-1')).toEqual({ extraNight: true, staying: true });
    state.extraNight = null;
    expect(await savedStayOf('SAM-1')).toEqual({ extraNight: false, staying: true });
  });
});
