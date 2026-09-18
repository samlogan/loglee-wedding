import { FaSistrix } from 'react-icons/fa';
import { FiDatabase } from 'react-icons/fi';
import { TbFile } from 'react-icons/tb';
import { defineType } from 'sanity';

import { SectionLibrary } from '../../components/SectionLibrary';
import { pageSections } from '../../helpers/sections';
import type { ISeoObject } from '../objects/seo';

interface IPageDocument {
  // Sanity fields
  _createdAt: string;
  _updatedAt: string;

  // Defined fields
  title: string;
  slug: {
    current: string;
  };
  pathname: string;
  breadcrumbs: {
    slug: {
      current: string;
    };
    pathname: string;
    title: string;
  }[];
  sections: { _key: string; _type: string; [key: string]: unknown }[];
  seoData: ISeoObject;
}

const page = defineType({
  fields: [
    {
      group: 'data',
      name: `title`,
      title: `Title`,
      type: `string`
    },
    {
      group: 'data',
      name: `slug`,
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
      description: `Breadcrumbs are displayed as 'Home > Current Page' by default. If you want to add paths in between 'Home' and 'Current Path' add them below:`,
      group: 'data',
      name: `breadcrumbs`,
      of: [
        {
          to: [{ type: 'page' }],
          type: 'reference'
        }
      ],
      title: `Breadcrumbs`,
      type: `array`
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
      icon: FiDatabase,
      name: 'data',
      title: 'Data'
    },
    {
      icon: FaSistrix,
      name: 'seo',
      title: 'SEO'
    }
  ],
  icon: TbFile,
  name: `page`,
  preview: {
    prepare(selection) {
      const { title, slug } = selection;
      return {
        subtitle: slug,
        title: title
      };
    },
    select: {
      slug: 'slug.current',
      title: 'title'
    }
  },
  title: `Page`,
  type: `document`
});

export default page;
export type { IPageDocument };
