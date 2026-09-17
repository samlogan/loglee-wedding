import { defineType } from 'sanity';

import type { IButtonElement } from '../elements/button';

interface IFooterObject {
  sitemap: {
    groupTitle: string;
    links: IButtonElement[];
  }[];
  disclaimer: SanityTextBlock[];
}

const linkGroup = defineType({
  fields: [
    {
      name: 'groupTitle',
      title: 'Group Title',
      type: 'string'
    },
    {
      name: 'links',
      of: [{ type: 'buttonElement' }],
      title: 'Links',
      type: 'array'
    }
  ],
  name: 'linkGroup',
  preview: {
    prepare: (selection) => ({
      title: selection.title || 'Link Group'
    }),
    select: {
      subtitle: 'links',
      title: 'groupTitle'
    }
  },
  title: 'Link Group',
  type: 'object'
});

const footer = defineType({
  fields: [
    {
      name: 'sitemap',
      of: [{ type: 'linkGroup' }],
      title: 'Sitemap',
      type: 'array'
    },
    {
      name: 'disclaimer',
      title: 'Disclaimer',
      type: 'blockContentSimple'
    }
  ],
  name: 'footer',
  preview: {
    prepare() {
      return {
        title: `Footer`
      };
    }
  },
  title: 'Footer',
  type: 'object'
});

export { footer, linkGroup };
export type { IFooterObject };
