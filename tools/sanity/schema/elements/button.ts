import { defineType } from 'sanity';

import type { ILinkElement } from './link';

interface IButtonElement {
  label: string;
  link: ILinkElement;
}

const buttonElement = defineType({
  fields: [
    {
      name: `label`,
      title: `Label`,
      type: `string`,
      // can't make this required because it will throw an error when add button isn't true
      validation: (Rule) => Rule.max(24)
    },
    {
      name: `link`,
      title: `Link`,
      type: `linkElement`
    }
  ],
  name: 'buttonElement',
  title: 'Link',
  type: 'object'
});

export default buttonElement;
export type { IButtonElement };
