import { TbDatabase, TbSearch, TbTags } from 'react-icons/tb';
import { defineType } from 'sanity';
import slugify from 'slugify';

import { IAuthorDocument } from '@/tools/sanity/schema/documents/author';
import type { ISeoObject } from '@/tools/sanity/schema/objects/seo';

interface IBlogPostCategoryDocument {
  // Sanity fields
  _createdAt: string;
  _updatedAt: string;

  // Defined fields
  title: string;
  slug: {
    current: string;
  };
  pathname: string;
  seoData: ISeoObject;
}

const blogPostCategory = defineType({
  fields: [
    {
      description: 'Category title.',
      group: 'data',
      name: `title`,
      title: `Title`,
      type: `string`
    },
    {
      description:
        '/blog/category will be automatically added to the back of the url. Please ensure forward slash / is added to beginning and end of the slug e.g. /example-category/',
      group: 'data',
      name: `slug`,
      options: {
        prefix: '/blog/category',
        slugify: (input: string) => `/${slugify(input, { lower: true, strict: true })}/`,
        source: 'title'
      },
      title: `Slug`,
      type: `slugElement`
    },
    {
      group: 'data',
      hidden: () => process.env.NODE_ENV === 'production',
      name: `pathname`,
      readOnly: true,
      title: `Pathname`,
      type: `string`
    },
    {
      group: 'seo',
      name: `seoData`,
      title: `Seo Data`,
      type: `seo`
    }
  ],
  groups: [
    {
      default: true,
      icon: TbDatabase,
      name: 'data',
      title: 'Data'
    },
    {
      icon: TbSearch,
      name: 'seo',
      title: 'SEO'
    }
  ],
  icon: TbTags,
  name: `blogPostCategory`,
  preview: {
    prepare: (selection) => ({
      subtitle: `/blog/category${selection.slug.current}`,
      title: selection.title
    }),
    select: {
      slug: 'slug',
      title: 'title'
    }
  },
  title: `Blog Post Category`,
  type: `document`
});

export default blogPostCategory;
export type { IBlogPostCategoryDocument };
