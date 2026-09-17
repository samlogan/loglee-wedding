import { defineType } from 'sanity';

const globalLogos = defineType({
  fields: [
    {
      name: 'logosSection',
      type: 'logosSection'
    }
  ],
  name: `globalLogos`,
  preview: {
    prepare(selection) {
      return {
        subtitle: selection?.internalLabel || `A row of logos.`,
        title: `Logos`
      };
    },
    select: {
      internalLabel: 'logosSection.internalLabel'
    }
  },
  title: `Global Logos`,
  type: `document`
});

export default globalLogos;
