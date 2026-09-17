import { defineType } from 'sanity';

import type { ISeoObject } from '../objects/seo';
import type { IBlogPostDocument } from './blogPost';

interface IBlogLandingPageDocument {
  // Sanity fields
  _createdAt: string;
  _updatedAt: string;

  // Defined fields
  title: string;
  featuredPost: IBlogPostDocument[];
  seoData: ISeoObject;
}

const blogLandingPage = defineType({
  fields: [
    {
      name: `title`,
      title: `Title`,
      type: `string`,
      validation: (Rule) => Rule.required()
    },
    {
      description: 'Select post to feature at the top of the blog landing page.',
      name: `featuredPost`,
      title: `Featured Post`,
      to: [{ type: `blogPost` }],
      type: `reference`
    },
    {
      name: `seoData`,
      title: `Seo Data`,
      type: `seo`
    }
  ],
  name: `blogLandingPage`,
  preview: {
    prepare() {
      return {
        title: `Blog Landing Page`
      };
    }
  },
  title: `Blog Landing Page`,
  type: `document`
});

export default blogLandingPage;
export type { IBlogLandingPageDocument };
