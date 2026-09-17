import { groq } from 'next-sanity';

import blockContentProjection from '@/tools/sanity/projections/common/blockContent.groq';

/**
 * The `richText` variant's copy is **joined from `weddingSettings`**, not authored on the section.
 *
 * ## Why the join is here and not a fetch in the component
 *
 * `weddingSettings.contribution` is the source of truth for the accommodation ask, and this section
 * is its only renderer — so the section needs the singleton, and a section rendered from
 * `sectionsProjection` has no access to whatever the page already fetched. Three ways to get it:
 *
 *   1. Give the section its own rich-text field. Duplicates content an editor already maintains, in
 *      a second place that can disagree with the first.
 *   2. `await sanityFetch(WEDDING_SETTINGS_QUERY)` inside the component. `components/Layout` already
 *      makes that call for the header's `rsvpLabel`, so this would be a **second round trip** for a
 *      document the request has in hand — and in draft mode and in development `sanityFetch` drops
 *      to the live API with `revalidate: 0`, where nothing dedupes it.
 *   3. Join it in GROQ, here. One request, no new fetch call site, and the copy arrives as props
 *      exactly like every other field — which is also what keeps the component a pure function of
 *      its props and therefore storyable.
 *
 * (3). The cost is that this projection reaches outside its own document, which is unusual for a
 * section and is why it is spelled out at this length.
 *
 * ## The conditionals are load-bearing, not tidiness
 *
 * `variant == 'richText' =>` wraps the join, so a `list` section never evaluates the sub-query and
 * the `contribution` key is **absent** from it rather than null. Verified against groq-js with a
 * hand-built dataset holding one of each variant: the list section came back with no `contribution`
 * key at all — so the dress-code band on Planner pays nothing for Stay's join.
 *
 * `items` is gated the same way, and it was not — which made the pair asymmetric in the direction
 * that actually ships data. A Sanity `hidden` predicate is a Studio display rule and nothing more:
 * the array an editor filled in on the `list` variant stays in the document when they switch to
 * `richText`, so an ungated `items` put a stale list on the wire for every `/stay` request that
 * would never render one.
 *
 * `!=` rather than `variant == 'list'`, and the difference is reachable. `variant` is `required()`
 * with `initialValue: 'list'`, but a draft can hold it unset — and the component destructures
 * `variant = 'list'`, so an unset variant *renders* the list. `variant == 'list'` would drop `items`
 * from exactly that document and blank the column; `!= 'richText'` matches the component's own
 * default. Both were run against groq-js on a three-section fixture (list / richText / unset): the
 * strict form returned no `items` key for the unset section, the negated form returned it.
 *
 * `_id == 'weddingSettings'` pins the singleton the same way `WEDDING_SETTINGS_QUERY` does, so the
 * drafts perspective resolves `drafts.weddingSettings` onto it in Presentation.
 *
 * `paymentDetails` is **not** projected. It is the bank details, shown only to a guest who has
 * already submitted an RSVP; pulling it into a page-builder section would publish it to anyone who
 * loads `/stay`.
 *
 * `title` needs no sub-projection — the `title` element is a plain string holding an HTML tag, which
 * `TextTitle` strips. `items` is an array of plain strings and projects as-is. Same as
 * `headerDisplaySection`.
 */
const twoColumnListSectionProjection = groq`
  _type == 'twoColumnListSection' => {
    variant,
    eyebrow,
    title,
    content[]${blockContentProjection},
    asideEyebrow,
    variant != 'richText' => {
      items
    },
    variant == 'richText' => {
      "contribution": *[_type == 'weddingSettings' && _id == 'weddingSettings'][0].contribution{
        showAmount,
        amountPerNight,
        copyWithAmount[]${blockContentProjection},
        copyWithoutAmount[]${blockContentProjection}
      }
    }
  },
`;

export default twoColumnListSectionProjection;
