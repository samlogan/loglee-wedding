import type { Metadata } from 'next';

import RsvpForm from '@/components/RsvpForm';
import type { RsvpGuest } from '@/components/RsvpForm';
import type { RsvpModelOption } from '@/components/RsvpForm/RsvpModel';
import Section from '@/components/Section';
import { stayPriceOf } from '@/helpers/guests';
import { PLAYER_SLUGS } from '@/templates/PlayerTemplate';
import { currentGuest } from '@/tools/guests/session';
import { sanityFetch } from '@/tools/sanity/lib/fetch';
import { RSVP_MODELS_QUERY, RSVP_PAGE_QUERY } from '@/tools/sanity/lib/queries.groq';

import { submitRsvp } from './actions';

/**
 * The RSVP page — a route rather than a CMS page, for the reason `thank-you` gives: it is the target
 * of every "RSVP" link on the site, so it has to exist whether or not anyone has published a page
 * with this slug, and a static segment outranks the `[...slug]` catch-all.
 *
 * The page is only the frame. The heading, the questions and the submit path all live in
 * `components/RsvpForm`, which takes the server action as a prop — so its stories drive it with a
 * mock and never touch the server.
 *
 * `spacing` is the comp's own: 44px from the header to the heading at the 1280px frame, which is
 * `sm`, and 64px under the button, which is `md`. `lg` caps the content at the frame's 1200px, the
 * width the rail and the questions were drawn against.
 */
const RsvpPage = async () => {
  const [models, page, signedIn] = await Promise.all([
    // The players' models, for the pair walking side by side in the rail.
    sanityFetch<RsvpModelOption[] | null>({
      params: { routes: [...PLAYER_SLUGS] },
      query: RSVP_MODELS_QUERY,
      tags: ['player']
    }),
    sanityFetch<{ rsvpNote?: SanityTextBlock[] | null } | null>({ query: RSVP_PAGE_QUERY, tags: ['weddingSettings'] }),
    // The guest from their cookie — prefills the form and shows their stay. The sheet being down
    // should cost the personal touches, not the form.
    currentGuest().catch(() => undefined)
  ]);

  const guest: RsvpGuest | undefined = signedIn && {
    email: signedIn.email,
    name: [signedIn.firstName, signedIn.lastName].filter(Boolean).join(' '),
    stay: stayPriceOf(signedIn)
  };

  return (
    <Section containerWidth="lg" name="rsvp" spacing={['sm', 'md']} theme="light">
      <RsvpForm action={submitRsvp} guest={guest} models={models ?? []} note={page?.rsvpNote ?? undefined} />
    </Section>
  );
};

/**
 * Out of the index. The whole site is private, and this page in particular collects personal
 * details — nothing about it belongs in search results. `follow` stays on for the reason the
 * thank-you page keeps it: the site chrome's links are still crawled from here.
 */
export const metadata: Metadata = {
  robots: { follow: true, googleBot: { follow: true, index: false }, index: false },
  title: 'RSVP'
};

export default RsvpPage;
