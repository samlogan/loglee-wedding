import { groq } from 'next-sanity';

import sectionsProjection from '../common/sections.groq';
import seoDataProjection from '../common/seoData.groq';

const pageProjection = groq`{
  _createdAt,
  _updatedAt,
  title,
  slug,
  pathname,
  breadcrumbs[]->{
    slug,
    pathname,
    title
  },
  sections[]${sectionsProjection},
  seoData${seoDataProjection}
}`;

export default pageProjection;
