import { groq } from 'next-sanity';

import blockContentProjection from '@/tools/sanity/projections/common/blockContent.groq';
import buttonProjection from '@/tools/sanity/projections/common/button.groq';

/**
 * ## `rsvp` is joined, not authored
 *
 * The RSVP button reads the reply-by line from `weddingSettings` and the switch, destination and
 * short label from `headerDocument.header` — the same fields `components/Layout` fetches for the
 * header pill, so the date on this button and the date in the nav cannot disagree. A section
 * rendered from `sectionsProjection` has no access to what the layout fetched, and a `sanityFetch`
 * in the component would be a second round trip for documents the request already asked for (and
 * one nothing dedupes in draft mode, where the fetch is uncached). So the join is here, the way
 * `TwoColumnListSection` joins its contribution copy — one request, and the values arrive as props,
 * which keeps the component a pure function of its props and therefore storyable.
 *
 * `rsvp` is shaped as the input of `tools/helpers/rsvpAction` — `rsvpLabel`, `addButton`, `button`
 * — so the section hands it over untouched and the helper applies the header's own rules to it. The
 * header's two fields are spread in rather than nested so the object is exactly that input; when the
 * header document does not exist the spread contributes nothing and the helper sees no button.
 *
 * Both singletons are pinned by `_id` the way `HEADER_QUERY` and `WEDDING_SETTINGS_QUERY` pin them,
 * so the drafts perspective resolves each draft onto it in Presentation, and the stega source map on
 * the label points the overlay at the document an editor has to open to change it.
 *
 * ## The conditionals are weight, not tidiness
 *
 * `addButton == true` gates the secondary button and `showRsvp != false` gates the join, so an
 * instance with either switched off carries neither the fields nor the two sub-queries on the wire —
 * a Sanity `hidden` predicate only hides a field in the Studio, and the button an editor filled in
 * stays in the document after they switch it off. `!= false` rather than `== true` for the RSVP,
 * because the field defaults to on and an instance saved before it existed has it unset; the
 * component reads it the same way.
 *
 * ## Revalidation
 *
 * A `weddingSettings` publish revalidates the `page` tag this query is fetched under. A
 * `headerDocument` publish calls `revalidatePath('/', 'layout')`, which reaches this too: Next tags
 * every fetch with the implicit tags of the route it ran in, and revalidating the root layout's path
 * expires every entry carrying the root layout's tag — the page query included, not only the layout's
 * own fetches.
 */
const closingCtaSectionProjection = groq`
  _type == 'closingCtaSection' => {
    content[]${blockContentProjection},
    addButton,
    addButton == true => {
      button${buttonProjection}
    },
    showRsvp,
    showRsvp != false => {
      "rsvp": {
        "rsvpLabel": *[_type == 'weddingSettings' && _id == 'weddingSettings'][0].rsvpLabel,
        ...*[_type == 'headerDocument' && _id == 'headerDocument'][0].header{
          addButton,
          button${buttonProjection}
        }
      }
    }
  },
`;

export default closingCtaSectionProjection;
