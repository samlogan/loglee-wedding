import { defineType } from 'sanity';

import type { IButtonElement } from '@/tools/sanity/schema/elements/button';

import type { ILinkElement } from '../elements/link';

interface IHeaderObject {
  navItems: {
    title: string;
    link: ILinkElement;
    dropdown: boolean;
    navSublinks: {
      title: string;
      link: ILinkElement;
    }[];
  }[];
  addButton: boolean;
  button?: IButtonElement;
  addSecondaryButton: boolean;
  secondaryButton: IButtonElement;
}

const navSublink = defineType({
  fields: [
    {
      name: 'title',
      title: 'Name',
      type: 'string'
    },
    {
      name: 'link',
      title: 'Link',
      type: 'linkElement'
    }
  ],
  name: 'navSublink',
  preview: {
    prepare: (selection) => ({
      subtitle: selection.description || undefined,
      title: selection.title || 'Dropdown Link'
    }),
    select: {
      description: 'description',
      title: 'title'
    }
  },
  title: 'Nav Sub Link',
  type: 'object'
});

const navLink = defineType({
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string'
    },
    {
      name: 'link',
      title: 'Link',
      type: 'linkElement'
    },
    {
      description:
        'Choose whether to include a dropdown menu of sublinks. If this is on, we remove the link from the nav item itself.',
      name: 'dropdown',
      title: 'Dropdown',
      type: 'boolean'
    },
    {
      hidden: ({ parent }) => !parent.dropdown,
      name: 'navSublinks',
      of: [{ type: 'navSublink' }],
      title: 'Nav Sublinks',
      type: 'array',
      validation: (Rule) =>
        Rule.custom((self, { parent }) => {
          const navParent = parent as { dropdown?: boolean };
          if (navParent.dropdown && !self) {
            return 'Please add dropdown links.';
          }
          if (!navParent.dropdown && !!self) {
            return 'Please remove dropdown links or switch navigation link to dropdown.';
          }
          return true;
        })
    }
  ],
  name: 'navLink',
  preview: {
    prepare: (selection) => ({
      title: selection.title || 'Nav Link'
    }),
    select: {
      title: 'title'
    }
  },
  title: 'Nav Link',
  type: 'object'
});

const header = defineType({
  fields: [
    {
      name: 'navItems',
      of: [{ type: 'navLink' }],
      title: 'Nav Items',
      type: 'array'
    },
    {
      name: `addButton`,
      title: `Add Primary Button`,
      type: `boolean`
    },
    {
      hidden: ({ parent }) => !parent?.addButton,
      name: `button`,
      title: `Primary Button`,
      type: `buttonElement`
    },
    {
      name: `addSecondaryButton`,
      title: `Add Secondary Button`,
      type: `boolean`
    },
    {
      hidden: ({ parent }) => !parent?.addSecondaryButton,
      name: `secondaryButton`,
      title: `Secondary Button`,
      type: `buttonElement`
    }
  ],
  name: 'header',
  preview: {
    prepare() {
      return {
        title: `Header`
      };
    }
  },
  title: 'Header',
  type: 'object'
});

export { header, navLink, navSublink };
export type { IHeaderObject };
