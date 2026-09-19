import { groq } from 'next-sanity';

import imageProjection from '@/tools/sanity/projections/common/image.groq';

/**
 * The players are **joined here, not referenced** — every `player` document, in its `order`.
 *
 * ## Why a join and not a field
 *
 * `player.order` already exists for exactly this ("Position on the Select Player screen, lowest
 * first") and the Studio lists players by it. A reference array on the section would be a second
 * ordering of the same two documents, and the first time an editor reordered one list and not the
 * other the home page and the Studio would disagree about who is `P1`. The sub-query sits inside the
 * `_type` conditional, so a page without this section never evaluates it.
 *
 * Same shape `twoColumnListSection` uses to join `weddingSettings`: the data arrives as props, so the
 * component stays a pure function of them and fetches nothing — which is also what makes it storyable.
 *
 * ## The ordering
 *
 * `order asc` sorts an unset `order` **last**, after every numbered player (verified against groq-js
 * with a mixed dataset). `_createdAt` breaks ties — two players at the same position, or two with
 * none — so the `P1` / `P2` labels, which are derived from the index, do not swap between requests.
 * Without it GROQ leaves the order of equal keys undefined.
 *
 * ## No filtering, deliberately
 *
 * A draft player can be missing its slug or its name, and a card needs both: the slug for the link,
 * the name for the chip and the link's accessible name. That test lives in the component rather than
 * in a `defined(slug.current)` filter here, because the component has to make it anyway — a slug of
 * whitespace passes `defined()`, and in draft mode every string arrives carrying an invisible stega
 * payload that only `hasText` knows to look past. One test, in the place that can make it correctly.
 *
 * ## What is and is not projected
 *
 * - `model.asset->url` only. The card needs a URL; `useGLTF` needs nothing else.
 * - `clips { idle, hover }`. `feature` is the player page's rest clip and never plays here.
 * - `fallbackImage` through the shared image projection, because `components/Image` needs the
 *   asset's `_id` and dimensions to resolve it — a bare URL renders the fallback's fallback.
 * - Not `eyebrow`, `level` or `stats`. Those are the player page's card, and this query runs on every
 *   request for the home page.
 */
const playerSelectSectionProjection = groq`
  _type == 'playerSelectSection' => {
    caption,
    prompt,
    "players": *[_type == 'player'] | order(order asc, _createdAt asc) {
      _id,
      name,
      slug {
        current
      },
      model {
        asset->{
          url
        }
      },
      clips {
        idle,
        hover
      },
      fallbackImage${imageProjection}
    }
  },
`;

export default playerSelectSectionProjection;
