import { defineType } from 'sanity';

import type { IFooterObject } from '../objects/footer';

interface IFooterDocument {
  footer: IFooterObject;
}

const footer = defineType({
  fields: [
    {
      name: 'footer',
      title: 'Footer',
      type: 'footer'
    }
  ],
  name: `footerDocument`,
  preview: {
    prepare() {
      return {
        title: 'Footer'
      };
    }
  },
  title: `Footer`,
  type: `document`
});

export default footer;
export type { IFooterDocument };
