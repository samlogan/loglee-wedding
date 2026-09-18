import { groq } from 'next-sanity';

import buttonProjection from '../projections/common/button.groq';
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
