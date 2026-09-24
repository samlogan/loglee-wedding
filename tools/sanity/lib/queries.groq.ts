import { groq } from 'next-sanity';

import blockContentProjection from '../projections/common/blockContent.groq';
import buttonProjection from '../projections/common/button.groq';
import imageProjection from '../projections/common/image.groq';
import linkProjection from '../projections/common/link.groq';
import pageProjection from '../projections/documents/page.groq';

export const DOCUMENT_QUERY = groq`
  *[_type in $types && pathname == $pathname][0]{
    _type,

    // ------------------
    // Page
    _type == 'page' => {
      "page": ${pageProjection}
    }
  }
`;

export const HEADER_QUERY = groq`
  *[_type == "headerDocument" && _id == "headerDocument"][0]{
    header {
      navItems[]{
        _key,
        title,
        link${linkProjection}
      },
      addButton,
      button${buttonProjection}
    }
  }
`;

/**
 * The wedding singleton, as the site chrome reads it.
 *
 * `rsvpLabel` is the "reply by 13 November" line the header pill carries, and the same field the
 * home page's RSVP action will read — one field, so the date cannot say two different things in
 * two places. The rest is the identity slice (who, when, where, and what they are told to reply
 * by), which is what anything site-wide needs; the contribution group is left to the sections that
 * use it.
 *
 * `venue` is projected whole rather than as `venue.name`, even though the footer's date-and-venue
 * line reads only the name: `address` and `mapUrl` are the "Get directions" action's, and a
 * three-field object costs the layout query nothing over a single string.
 *
 * Also one of the singletons `tools/storybook/generate-fixtures.ts` pulls into
 * `fixtures/globals.json`, which is why it is a shared constant rather than an inline query.
 */
export const WEDDING_SETTINGS_QUERY = groq`
  *[_type == "weddingSettings" && _id == "weddingSettings"][0]{
    title,
    coupleNames,
    startDate,
    endDate,
    venue,
    rsvpDeadline,
    rsvpLabel
  }
`;

/*
 * There is no `FOOTER_QUERY`, and that is a decision rather than an omission.
 *
 * `footerDocument` held a `sitemap` array of link groups and a `disclaimer`, neither of which was
 * ever rendered — the component drew the literal string "Sitemap" where the first belonged. The
 * footer's links are now `headerDocument.header.navItems`, the *same array the bar renders*, so the
 * two cannot disagree about what the site's five pages are; its date and venue come from
 * `weddingSettings`. That left the document with nothing an editor could fill in, so it is gone
 * along with its `footer` and `linkGroup` object types. See `components/Footer`.
 */

export const SOCIAL_MEDIA_QUERY = groq`
  *[_type == "socialMediaDocument" && _id == "socialMediaDocument"][0]{
    socials[]{
      _key,
      name,
      link
    }
  }
`;

export const SITEMAP_QUERY = groq`
  *[_type in ['page', 'route'] && !(_id in path("drafts.**")) && (!defined(seoData.noIndex) || seoData.noIndex == false)] {
    _type, 
    _id, 
    _updatedAt, 
    pathname
  }
`;

/**
 * One player plus the roster, for `templates/PlayerTemplate`.
 *
 * The roster is fetched alongside rather than derived per route because both the pager ("01 / 02")
 * and the switch control ("→ Lauren") are facts about the *set* of players, and `order` — not
 * route order or file order — is what the Studio says the sequence is.
 *
 * It is limited to `$routes`, the slugs that have a page (`PLAYER_SLUGS` in
 * `templates/PlayerTemplate`). The Studio lets an editor create any number of players, but each
 * page is a static route file, so a player with any other slug has nowhere to link to: left in, it
 * would make the pager read "01 / 03" and point Lauren's switch control at a 404. A third player
 * needs a route file and an entry in that list, and then appears here with no query change.
 *
 * `defined(name)` on both, because `Rule.required()` binds the Studio's publish button and not the
 * drafts perspective: a draft whose name has been cleared would otherwise reach the page as `null`
 * and throw on render, where a player with no name should 404 like one that does not exist. `_id`
 * breaks ties in `order` — the field is optional, and GROQ leaves equal keys in no stated order, so
 * without it two unnumbered players could swap places between fetches.
 *
 * `gallery` sits beside `player` rather than inside it because it is not the showcase's — the
 * template hands it to `ImageCarouselSection` under the showcase, so `PlayerShowcasePlayer` does not
 * grow a field it never reads.
 *
 * `modelLabel` and `modelBadge` are the 3D panel's corner label and chip, authored per player. The
 * chip used to be read from the model file's `originalFilename`; it is plain text now, so it can say
 * anything — or nothing.
 */
export const PLAYER_PAGE_QUERY = groq`{
  "player": *[_type == "player" && slug.current == $slug && defined(name)][0]{
    name,
    "slug": slug.current,
    eyebrow,
    level,
    clips,
    stats,
    "model": model.asset->{ url },
    modelLabel,
    modelBadge,
    fallbackImage${imageProjection}
  },
  "roster": *[_type == "player" && slug.current in $routes && defined(name)] | order(order asc, _id asc){
    name,
    "slug": slug.current,
    selectLabel,
    eyebrow
  },
  "gallery": *[_type == "player" && slug.current == $slug && defined(name)][0].gallery[]{
    _key,
    ...@${imageProjection}
  }
}`;

/**
 * The players' models, for the RSVP page's rail, which shows one of them at random.
 *
 * Only players with a page (`$routes`) and a model file — a player with no GLB has nothing to put in
 * the rail. The fields are the ones `ModelViewer` takes; `clips` is the three authored names the
 * rail chooses an animation from.
 */
export const RSVP_MODELS_QUERY = groq`
  *[_type == "player" && slug.current in $routes && defined(name) && defined(model.asset)] | order(order asc, _id asc){
    name,
    clips,
    "src": model.asset->url,
    fallbackImage${imageProjection}
  }
`;

/**
 * The RSVP page's own slice of Wedding Settings: the note under the heading. Kept out of
 * `WEDDING_SETTINGS_QUERY`, which the layout runs on every page.
 */
export const RSVP_PAGE_QUERY = groq`
  *[_type == "weddingSettings" && _id == "weddingSettings"][0]{
    rsvpNote[]${blockContentProjection}
  }
`;

/**
 * The payment details, for the thank-you page — both versions; the page shows the one for the signed-in
 * guest. Only ever fetched on a page behind the guest gate, and never in the layout's query.
 */
export const PAYMENT_DETAILS_QUERY = groq`
  *[_type == "weddingSettings" && _id == "weddingSettings"][0].contribution{
    paymentDetailsAustralia[]${blockContentProjection},
    paymentDetailsInternational[]${blockContentProjection}
  }
`;
