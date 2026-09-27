import 'server-only';
import type { Guest } from '@/helpers/guests';
import { nationalityNoteId, nationalityOf } from '@/helpers/nationality';
import { sanityFetch } from '@/tools/sanity/lib/fetch';
import { GUEST_REPLY_EXTRAS_QUERY } from '@/tools/sanity/lib/queries.groq';

/**
 * What a guest is shown once they have replied — on the thank-you page and in the thank-you email:
 * the payment details for their country and the travel note for their nationality, when there is one.
 *
 * Payment details are their country's own when its nationality document has them (the US, the UK and
 * France — `NATIONALITIES`), and otherwise their region's (`paymentRegionOf`): the Australian account
 * for a blank or Australian nationality, the international (Wise) details for everyone else.
 */
export interface ReplyExtras {
  payment?: SanityTextBlock[];
  travel?: { title?: string; content: SanityTextBlock[] };
  /** The thank-you email's opening paragraphs, from Wedding Settings → Emails. */
  emailIntro?: string[];
}

interface ReplyExtrasResult {
  payment?: { australia?: SanityTextBlock[] | null; international?: SanityTextBlock[] | null } | null;
  travel?: {
    title?: string | null;
    content?: SanityTextBlock[] | null;
    paymentDetails?: SanityTextBlock[] | null;
  } | null;
  emailIntro?: string[] | null;
}

export const replyExtrasFor = async (guest: Pick<Guest, 'nationality' | 'payment'>): Promise<ReplyExtras> => {
  const nationality = nationalityOf(guest.nationality);
  const result = await sanityFetch<ReplyExtrasResult | null>({
    params: { noteId: nationality ? nationalityNoteId(nationality) : '' },
    query: GUEST_REPLY_EXTRAS_QUERY,
    tags: ['paymentDetails', 'nationalityNote']
  });

  const travel = result?.travel;
  const byRegion = guest.payment === 'au' ? result?.payment?.australia : result?.payment?.international;
  const payment = travel?.paymentDetails?.length ? travel.paymentDetails : byRegion;
  return {
    emailIntro: result?.emailIntro ?? undefined,
    payment: payment?.length ? payment : undefined,
    travel: travel?.content?.length ? { content: travel.content, title: travel.title ?? undefined } : undefined
  };
};
