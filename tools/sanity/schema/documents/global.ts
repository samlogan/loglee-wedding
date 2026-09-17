import { defineType } from 'sanity';

const global = defineType({
  fields: [
    {
      group: 'navbar',
      name: 'navbar',
      title: 'Navbar',
      type: 'navbar'
    },
    {
      group: 'footer',
      name: `footer`,
      title: `Footer`,
      type: `footer`
    }
  ],
  name: `global`,
  preview: {
    prepare() {
      return {
        title: `Global`
      };
    }
  },
  title: `Global`,
  type: `document`
});

export default global;
