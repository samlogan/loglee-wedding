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
        title,
        link${linkProjection},
        dropdown,
        navSublinks[]{
          title,
          link${linkProjection}
        }
      },
      addButton,
      button${buttonProjection},
      addSecondaryButton,
      secondaryButton${buttonProjection}
    }
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
