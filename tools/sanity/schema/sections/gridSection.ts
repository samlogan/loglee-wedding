import { TbLayoutGrid } from 'react-icons/tb';
import { defineType } from 'sanity';

import thumbnail from '../../../../sections/GridSection/thumbnail.png';
import ReadOnlyImageInput from '../../components/ReadOnlyImageInput';
import defaultSectionGroups from '../common/defaultSectionGroups';
import internalLabelField from '../common/internalLabelField';
import type { IButtonElement } from '../elements/button';

interface IGridSection {
  tagline: string;
  title: string;
  content: SanityTextBlock[];
  cards: {
    image: SanityImage;
    title: string;
    content: SanityTextBlock[];
    addButton: boolean;
    button: IButtonElement;
  }[];
}

const gridSection = defineType({
  fields: [
    internalLabelField,
    {
      name: 'sectionPreview',
      title: 'Section Preview',
      type: 'image',
      components: { input: ReadOnlyImageInput },
      // @ts-expect-error
      imageUrl: thumbnail.src,
      readOnly: true,
      group: 'internal'
    },
    {
      group: 'data',
      name: `tagline`,
      title: `Tagline`,
      type: 'string'
    },
    {
      group: 'data',
      name: `title`,
      title: `Title`,
      type: 'title'
    },
    {
      group: 'data',
      name: `content`,
      title: `Content`,
      type: `blockContentSimple`
    },
    {
      group: 'data',
      name: 'cards',
      of: [{ type: 'gridCard' }],
      title: 'Cards',
      type: 'array'
    },
    {
      group: 'styles',
      name: 'sectionFields',
      title: 'Section Fields',
      type: 'sectionFields'
    }
  ],
  groups: defaultSectionGroups,
  icon: TbLayoutGrid,
  name: 'gridSection',
  preview: {
    prepare(selection) {
      return {
        subtitle: selection?.internalLabel,
        title: `Grid`
      };
    },
    select: {
      internalLabel: 'internalLabel'
    }
  },
  title: 'Grid',
  type: 'object'
});

const gridCard = defineType({
  fields: [
    {
      name: `image`,
      title: `Image`,
      type: `imageElementSimple`
    },
    {
      name: 'title',
      title: 'Title',
      type: 'string'
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
      hidden: ({ parent }) => !parent?.addButton,
      name: `button`,
      title: `Button`,
      type: `buttonElement`
    }
  ],
  name: 'gridCard',
  preview: {
    prepare: (selection) => ({
      title: selection?.title
    }),
    select: {
      title: 'title'
    }
  },
  title: 'Grid Card',
  type: 'object'
});

export { gridSection, gridCard };
export type { IGridSection };
