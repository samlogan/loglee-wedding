import stripTitleTags from '../../helpers/stripTitleTags';

// turn into cards
// Feature card - img, title, content, cta => advanced card
const featureCard = {
  fields: [
    {
      name: `image`,
      title: `Image`,
      type: `imageElementSimple`
    },
    {
      name: 'title',
      options: {
        defaultTag: 'span'
      },
      title: 'Title',
      type: 'title'
    },
    {
      name: `content`,
      title: `Content`,
      type: 'blockContentSimple'
    },
    {
      initialValue: false,
      name: `addButton`,
      title: `Add Button`,
      type: `boolean`
    },
    {
      hidden: ({ parent }: { parent: { addButton?: boolean } }) => !parent?.addButton,
      name: `button`,
      title: `Button`,
      type: `buttonElement`
    }
  ],
  name: 'featureCard',
  preview: {
    prepare: (selection: { title?: string }) => ({
      title: stripTitleTags(selection?.title)
    }),
    select: {
      title: 'title'
    }
  },
  title: 'Feature Card',
  type: 'object'
};

export default featureCard;
