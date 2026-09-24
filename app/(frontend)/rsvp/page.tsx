import type { Metadata } from 'next';

import RsvpForm from '@/components/RsvpForm';
import type { RsvpGuest } from '@/components/RsvpForm';
import type { RsvpModelOption } from '@/components/RsvpForm/RsvpModel';
import Section from '@/components/Section';
import { showsCurrency } from '@/helpers/formatAmount';
import { stayPriceOf } from '@/helpers/guests';
import { PLAYER_SLUGS } from '@/templates/PlayerTemplate';
import { currentGuest } from '@/tools/guests/session';
import { sanityFetch } from '@/tools/sanity/lib/fetch';
import { RSVP_MODELS_QUERY, RSVP_PAGE_QUERY } from '@/tools/sanity/lib/queries.groq';
import type { RsvpFormCopy } from '@/tools/sanity/schema/documents/weddingSettings';

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
/** A field's text, or `undefined` when it is blank — so the form's own words stand in. */
const filled = (value?: string | null) => value?.trim() || undefined;

/**
 * For a line the form can do without — the intro and the rest of it, the stay note, the Sunday night's
 * description — blank means *none*: an editor who clears it wants it gone, and Sanity cannot tell a
 * cleared field from one never filled in. Only when the RSVP Form fields have never been saved at all
 * does the form keep its own words.
 */
const optional = (copy: RsvpFormCopy | null | undefined, value?: string | null) =>
  copy ? (value?.trim() ?? '') : undefined;

const RsvpPage = async () => {
  const [models, page, signedIn] = await Promise.all([
    // The players' models, for the pair walking side by side in the rail.
    sanityFetch<RsvpModelOption[] | null>({
      params: { routes: [...PLAYER_SLUGS] },
      query: RSVP_MODELS_QUERY,
      tags: ['player']
    }),
    sanityFetch<{ rsvpNote?: SanityTextBlock[] | null; rsvpForm?: RsvpFormCopy | null } | null>({
      query: RSVP_PAGE_QUERY,
      tags: ['weddingSettings']
    }),
    // The guest from their cookie — prefills the form and shows their stay. The sheet being down
    // should cost the personal touches, not the form.
    currentGuest().catch(() => undefined)
  ]);

  const guest: RsvpGuest | undefined = signedIn && {
    email: signedIn.email,
    name: [signedIn.firstName, signedIn.lastName].filter(Boolean).join(' '),
    stay: stayPriceOf(signedIn),
    withCurrency: showsCurrency(signedIn)
  };

  // The form's words from Wedding Settings. A blank field is left out, so the form keeps its own.
  const copy = page?.rsvpForm;
  const placeholders = Object.fromEntries(
    Object.entries(copy?.placeholders ?? {}).flatMap(([key, value]) => (filled(value) ? [[key, filled(value)]] : []))
  );

  return (
    <Section containerWidth="lg" name="rsvp" spacing={['sm', 'md']} theme="light">
      <RsvpForm
        action={submitRsvp}
        extraNightDescription={optional(copy, copy?.extraNightDescription)}
        extraNightLabel={filled(copy?.extraNightLabel)}
        guest={guest}
        heading={filled(copy?.heading)}
        intro={optional(copy, copy?.intro)}
        introDetail={optional(copy, copy?.introDetail)}
        models={models ?? []}
        note={page?.rsvpNote ?? undefined}
        placeholders={placeholders}
        stayNote={optional(copy, copy?.stayNote)}
        stayingLabel={filled(copy?.stayingLabel)}
      />
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
