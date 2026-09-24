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
  /** The thank-you email's opening paragraphs, from Wedding Settings → Emails. */
  emailIntro?: string[];
}

interface ReplyExtrasResult {
  payment?: { australia?: SanityTextBlock[] | null; international?: SanityTextBlock[] | null } | null;
  travel?: { title?: string | null; content?: SanityTextBlock[] | null } | null;
  emailIntro?: string[] | null;
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
    emailIntro: result?.emailIntro ?? undefined,
    payment: payment?.length ? payment : undefined,
    travel: travel?.content?.length ? { content: travel.content, title: travel.title ?? undefined } : undefined
  };
};

/**
 * What the guest's saved reply says about their stay — whether they are staying at the venue, and
 * whether they take the Sunday night — read from their `rsvp` document, which only the server can:
 * replies are private (`RSVP_ID_PREFIX`).
 *
 * Staying unless the reply says otherwise: replies sent before the form asked were all staying, and
 * with no reply, or no dataset, the stay the sheet gives is the best answer there is.
 */
export const savedStayOf = async (guestId: string): Promise<{ staying: boolean; extraNight: boolean }> => {
  const saved = await writeClient
    ?.fetch<{ staying?: boolean | null; extraNight?: boolean | null } | null>(
      '*[_type == "rsvp" && guestId == $guestId] | order(submittedAt desc)[0]{ staying, extraNight }',
      { guestId }
    )
    .catch(() => null);
  const staying = saved?.staying !== false;
  return { extraNight: staying && saved?.extraNight === true, staying };
};
