import { groq } from 'next-sanity';

import imageProjection from '../common/image.groq';
import sectionsProjection from '../common/sections.groq';
import seoDataProjection from '../common/seoData.groq';

const blogPostProjection = groq`{
  _createdAt,
  _updatedAt,
  title,
  tagline,
  slug,
  pathname,
  author->{
    _id,
    firstName,
    lastName,
    role,
    image${imageProjection}
  },
  publishDate,
  categories[]->{
    _id,
    title,
    slug,
    pathname
  },
  featureImage,
  sections[]${sectionsProjection},
  seoData${seoDataProjection}
}`;

export default blogPostProjection;
