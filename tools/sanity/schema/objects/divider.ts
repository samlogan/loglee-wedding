import { defineType } from 'sanity';

const divider = defineType({
  fields: [
    {
      name: 'colour',
      options: {
        direction: 'horizontal',
        layout: 'radio',
        list: [
          { value: 'white', title: 'White' },
          { value: 'grey', title: 'Grey' },
          { value: 'primary', title: 'Primary' }
        ]
      },
      title: 'Colour',
      type: 'string'
    }
  ],
  initialValue: {
    colour: 'grey'
  },
  name: 'divider',
  preview: {
    prepare() {
      return {
        title: `Divider`
      };
    }
  },
  title: 'Divider',
  type: 'object'
});

export default divider;
