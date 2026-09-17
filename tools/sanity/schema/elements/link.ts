import type { ObjectDefinition } from 'sanity';
import { defineType } from 'sanity';

interface ILinkElement {
  linkType?: 'internal' | 'external' | 'phone' | 'email' | 'action';
  internalLink?: {
    _ref?: string;
    title?: string;
    slug: {
      current: string;
    };
    pathname: string;
  };
  externalLink?: string;
  phone?: string;
  email?: string;
  action?: string;

  // Catch
  href?: string;
}

// These fields are exported for use in blockContent schema annotations
const linkElementFields: ObjectDefinition['fields'] = [
  {
    name: 'linkType',
    options: {
      direction: 'horizontal',
      layout: 'radio',
      list: [
        { title: 'Internal', value: 'internal' },
        { title: 'External', value: 'external' },
        { title: 'Phone', value: 'phone' },
        { title: 'Email', value: 'email' },
        { title: 'Action', value: 'action' }
      ]
    },
    title: 'Link Type',
    type: 'string'
  },
  {
    hidden: ({ parent }) => parent?.linkType !== 'internal',
    name: 'internalLink',
    title: 'Internal Link',
    to: [{ type: 'page' }, { type: 'route' }, { type: 'blogPost' }, { type: 'blogPostCategory' }],
    type: 'reference'
  },
  {
    hidden: ({ parent }) => parent?.linkType !== 'external',
    name: 'externalLink',
    title: 'External Link',
    type: 'url'
  },
  {
    hidden: ({ parent }) => parent?.linkType !== 'phone',
    name: 'phone',
    title: 'Phone',
    type: 'string'
  },
  {
    hidden: ({ parent }) => parent?.linkType !== 'email',
    name: 'email',
    title: 'Email',
    type: 'string'
  },
  {
    hidden: ({ parent }) => parent?.linkType !== 'action',
    name: 'action',
    title: 'Action',
    type: 'string'
  }
];

const linkElement = defineType({
  fields: linkElementFields,
  name: 'linkElement',
  options: {
    collapsible: false
  },
  title: 'Link',
  type: 'object'
});

export default linkElement;
export { linkElementFields };
export type { ILinkElement };
