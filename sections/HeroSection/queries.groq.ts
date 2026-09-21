import { groq } from 'next-sanity';

/**
 * The hero's one field of its own is `title`; everything else it shows is **joined from
 * `weddingSettings`**, including the couple's names the heading falls back to when `title` is blank.
 *
 * ## Why a join, and why here
 *
 * The same three options `twoColumnListSection`'s projection weighs for the contribution copy, with
 * the same answer. Copying the dates or venue onto the section would give them a second home that
 * could disagree with the singleton the footer and the thank-you page read. An
 * `await sanityFetch(WEDDING_SETTINGS_QUERY)` inside the component would be a second round trip for
 * a document `components/Layout` already fetches, and in draft mode nothing dedupes it. A GROQ join
 * is one request, and the singleton's fields arrive as props like any other field — which is also
 * what keeps the component a pure function of its props, and therefore storyable.
 *
 * `_id == 'weddingSettings'` pins the singleton the way `WEDDING_SETTINGS_QUERY` does, so the drafts
 * perspective resolves `drafts.weddingSettings` onto it in Presentation: an edit to a name shows on
 * the hero before it is published. On the published site the `page` tag carries it —
 * `/api/revalidate` revalidates `page` whenever `weddingSettings` changes, and this join is why that
 * matters here.
 *
 * ## Only what is rendered
 *
 * Each object is projected field by field rather than whole. `venue.mapUrl` has no renderer in this
 * section, and `yarn audit:projections` counts every key a section adds to every page query.
 *
 * `travelNote` is projected here and not added to `WEDDING_SETTINGS_QUERY`: the layout reads that
 * query and has no use for it. (That query projects `venue` whole, so the field will reach the
 * layout's result anyway once an editor fills it in — unread there, and three words long.)
 *
 * `address` is projected whole and split in the component, not with `string::split` here. The
 * component takes the singleton's own shape, which is what lets a story pass the published
 * `weddingSettings` fixture straight through; a GROQ-derived `street` key would be a shape that
 * exists nowhere else.
 */
const heroSectionProjection = groq`
  _type == 'heroSection' => {
    title,
    "weddingSettings": *[_type == 'weddingSettings' && _id == 'weddingSettings'][0]{
      coupleNames{
        partnerOne,
        partnerTwo
      },
      startDate,
      endDate,
      venue{
        name,
        address,
        travelNote
      }
    }
  },
`;

export default heroSectionProjection;
