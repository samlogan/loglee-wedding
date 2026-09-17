import { defineType } from 'sanity';

import type { IHeaderObject } from '../objects/header';

interface IHeaderDocument {
  header: IHeaderObject;
}

const header = defineType({
  fields: [
    {
      name: 'header',
      title: 'Header',
      type: 'header'
    }
  ],
  name: `headerDocument`,
  preview: {
    prepare() {
      return {
        title: 'Header'
      };
    }
  },
  title: `Header`,
  type: `document`
});

export default header;
export type { IHeaderDocument };
