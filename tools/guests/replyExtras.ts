import 'server-only';
import type { Guest } from '@/helpers/guests';
import { nationalityNoteId, nationalityOf } from '@/helpers/nationality';
import { sanityFetch } from '@/tools/sanity/lib/fetch';
import { GUEST_REPLY_EXTRAS_QUERY } from '@/tools/sanity/lib/queries.groq';
import writeClient from '@/tools/sanity/lib/writeClient';

/**
 * What a guest is shown once they have replied — on the thank-you page and in the thank-you email:
 * the payment details for their region (`paymentRegionOf`: the Australian account, or Wise) and the
 * travel note for their nationality, when there is one.
 */
export interface ReplyExtras {
  payment?: SanityTextBlock[];
  travel?: { title?: string; content: SanityTextBlock[] };
}

interface ReplyExtrasResult {
  payment?: { australia?: SanityTextBlock[] | null; international?: SanityTextBlock[] | null } | null;
  travel?: { title?: string | null; content?: SanityTextBlock[] | null } | null;
}

export const replyExtrasFor = async (guest: Pick<Guest, 'nationality' | 'payment'>): Promise<ReplyExtras> => {
  const nationality = nationalityOf(guest.nationality);
  const result = await sanityFetch<ReplyExtrasResult | null>({
    params: { noteId: nationality ? nationalityNoteId(nationality) : '' },
    query: GUEST_REPLY_EXTRAS_QUERY,
    tags: ['paymentDetails', 'nationalityNote']
  });

  const payment = guest.payment === 'au' ? result?.payment?.australia : result?.payment?.international;
  const travel = result?.travel;
  return {
    payment: payment?.length ? payment : undefined,
    travel: travel?.content?.length ? { content: travel.content, title: travel.title ?? undefined } : undefined
  };
};

/**
 * Whether the guest's saved reply takes the Sunday night — read from their `rsvp` document, which
 * only the server can: replies are private (`RSVP_ID_PREFIX`). `false` when there is no reply, or
 * the dataset cannot be read.
 */
export const takesExtraNight = async (guestId: string): Promise<boolean> => {
  const extraNight = await writeClient
    ?.fetch<boolean | null>('*[_type == "rsvp" && guestId == $guestId] | order(submittedAt desc)[0].extraNight', {
      guestId
    })
    .catch(() => null);
  return extraNight === true;
};
