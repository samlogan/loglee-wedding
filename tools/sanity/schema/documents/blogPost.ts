import { TbDatabase, TbSearch, TbWriting } from 'react-icons/tb';
import { defineType } from 'sanity';
import slugify from 'slugify';

import { pageSections } from '@/tools/sanity/helpers/sections';

import { SectionLibrary } from '../../components/SectionLibrary';
import type { ISeoObject } from '../objects/seo';
import type { IAuthorDocument } from './author';

interface IBlogPostDocument {
  // Sanity fields
  _createdAt: string;
  _updatedAt: string;

  // Defined fields
  title: string;
  tagline: string;
  slug: {
    current: string;
  };
  pathname: string;
  author: IAuthorDocument & { _id: string };
  publishDate: string;
  categories: { _id: string; title: string; slug: { current: string }; pathname: string }[];
  featureImage: SanityImage;
  sections: { _key: string; _type: string; [key: string]: unknown }[];
  seoData: ISeoObject;
}

const blogPost = defineType({
  fields: [
    {
      description: 'The blog post title.',
      group: 'data',
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required()
    },
    {
      description: 'Short accompanying text.',
      group: 'data',
      name: 'tagline',
      title: 'Tagline',
      type: 'string',
      validation: (Rule) => Rule.required()
    },
    {
      description:
        '/blog will be automatically added to the back of the url. Please ensure forward slash / is added to beginning and end of the slug e.g. /example-post/',
      group: 'data',
      name: `slug`,
      options: {
        prefix: '/blog',
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
      description: 'The blog post author.',
      group: 'data',
      name: 'author',
      title: 'Author',
      to: [{ type: 'author' }],
      type: 'reference'
    },
    {
      description: 'The blog post publish date.',
      group: 'data',
      name: 'publishDate',
      title: 'Publish Date',
      type: 'date',
      validation: (Rule) => Rule.required()
    },
    {
      group: 'data',
      name: 'categories',
      of: [{ to: [{ type: 'blogPostCategory' }], type: 'reference' }],
      title: 'Categories',
      type: 'array',
      validation: (Rule) => Rule.required()
    },
    {
      group: 'data',
      name: 'featureImage',
      title: 'Feature Image',
      type: 'imageElementSimple',
      validation: (Rule) => Rule.required()
    },
    {
      components: { input: SectionLibrary },
      group: 'data',
      name: `sections`,
      of: pageSections,
      title: `Sections`,
      type: `array`
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
      icon: TbWriting,
      name: 'content',
      title: 'Content'
    },
    {
      icon: TbSearch,
      name: 'seo',
      title: 'SEO'
    }
  ],
  icon: TbWriting,
  name: `blogPost`,
  preview: {
    prepare(selection) {
      const { title, pathname, media } = selection;
      return {
        media: media,
        subtitle: pathname,
        title: title
      };
    },
    select: {
      media: `featureImage.image`,
      pathname: `pathname`,
      title: `title`
    }
  },
  title: `Blog Post`,
  type: `document`
});

export default blogPost;
export type { IBlogPostDocument };
