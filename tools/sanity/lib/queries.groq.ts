import { groq } from 'next-sanity';

import blockContentProjection from '../projections/common/blockContent.groq';
import buttonProjection from '../projections/common/button.groq';
import linkProjection from '../projections/common/link.groq';
import seoDataProjection from '../projections/common/seoData.groq';
import blogPostProjection from '../projections/documents/blogPost.groq';
import pageProjection from '../projections/documents/page.groq';

export const POSTS_QUERY = groq`*[_type == "blogPost" && defined(pathname)]${blogPostProjection} | order(publishDate desc, _createdAt desc)`;

export const POST_QUERY = groq`*[_type == "blogPost" && pathname == $pathname][0]${blogPostProjection}`;

export const BLOG_LANDING_QUERY = groq`
  *[_type == "blogLandingPage" && _id == "blogLandingPage"][0]{
    _createdAt,
    _updatedAt,
    title,
    featuredPost[]${blogPostProjection},
    seoData${seoDataProjection}
  }
`;

export const DOCUMENT_QUERY = groq`
  *[_type in $types && pathname == $pathname][0]{
    _type,

    // ------------------
    // Page
    _type == 'page' => {
      "page": ${pageProjection}
    },

    // ------------------
    // Blog Post
    _type == 'blogPost' => {
      "blogPost": ${blogPostProjection}
    },
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
 * two places. The rest of the projection is the identity slice (who, when, where they are told to
 * reply by), which is what anything site-wide needs; the venue and contribution groups are left
 * to the sections that use them.
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
    rsvpDeadline,
    rsvpLabel
  }
`;

export const FOOTER_QUERY = groq`
  *[_type == "footerDocument" && _id == "footerDocument"][0]{
    footer {
      sitemap[]{
        groupTitle,
        links[]${buttonProjection}
      },
      disclaimer${blockContentProjection}
    }
  }
`;

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
  *[_type in ['page', 'blogPost', 'route'] && !(_id in path("drafts.**")) && (!defined(seoData.noIndex) || seoData.noIndex == false)] {
    _type, 
    _id, 
    _updatedAt, 
    pathname
  }
`;
