import { defineType } from 'sanity';

const settings = defineType({
  fields: [
    {
      name: `redirectsArr`,
      of: [{ type: `redirect` }],
      title: `Redirects`,
      type: 'array'
    }
  ],
  name: `settings`,
  preview: {
    prepare() {
      return {
        title: `Settings`
      };
    }
  },
  title: `Settings`,
  type: `document`
});

export default settings;
