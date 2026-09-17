import { TbRoad } from 'react-icons/tb';
import { defineType } from 'sanity';

const route = defineType({
  fields: [
    {
      name: `title`,
      readOnly: process.env.NODE_ENV === 'production',
      title: `Title`,
      type: `string`
    },
    {
      name: `path`,
      readOnly: process.env.NODE_ENV === 'production',
      title: `Slug`,
      type: `slugElement`
    },
    {
      hidden: () => process.env.NODE_ENV === 'production',
      name: `pathname`,
      readOnly: true,
      title: `Pathname`,
      type: `string`
    },
    {
      name: `description`,
      readOnly: process.env.NODE_ENV === 'production',
      title: `Description`,
      type: `string`
    }
  ],
  icon: TbRoad,
  name: `route`,
  preview: {
    prepare(selection) {
      return {
        title: selection.title
      };
    },
    select: {
      title: 'title'
    }
  },
  title: `Route`,
  type: `document`
});

export default route;
