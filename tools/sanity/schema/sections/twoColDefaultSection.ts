import { TbColumns2 } from 'react-icons/tb';
import { defineType } from 'sanity';

import thumbnail from '../../../../sections/TwoColumnDefaultSection/thumbnail.jpg';
import ReadOnlyImageInput from '../../components/ReadOnlyImageInput';
import defaultSectionGroups from '../common/defaultSectionGroups';
import internalLabelField from '../common/internalLabelField';
import type { IButtonElement } from '../elements/button';

interface ITwoColumnDefaultSection {
  tagline: string;
  title: string;
  content: SanityTextBlock[];
  addButton: boolean;
  button?: IButtonElement;
  image: SanityImage;
  alignMedia: 'left' | 'right';
  theme: 'light' | 'dark';
}

const twoColDefaultSection = defineType({
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
      type: `string`
    },
    {
      group: 'data',
      name: `title`,
      title: `Title`,
      type: `title`
    },
    {
      group: 'data',
      name: `content`,
      title: `Content`,
      type: 'blockContentSimple'
    },
    {
      group: 'data',
      initialValue: false,
      name: `addButton`,
      title: `Add Button`,
      type: `boolean`
    },
    {
      group: 'data',
      hidden: ({ parent }) => !parent?.addButton,
      name: `button`,
      title: `Button`,
      type: `buttonElement`
    },
    {
      group: 'data',
      name: `image`,
      title: `Image`,
      type: `imageElementSimple`
    },
    {
      group: 'styles',
      name: 'alignMedia',
      title: 'Align Media',
      type: 'alignMedia'
    },
    {
      initialValue: 'light',
      name: 'theme',
      options: {
        direction: 'horizontal',
        layout: 'radio',
        list: [
          { title: 'Light', value: 'light' },
          { title: 'Dark', value: 'dark' },
          { title: 'Primary', value: 'primary' },
          { title: 'Secondary', value: 'secondary' },
          { title: 'Tertiary', value: 'tertiary' }
        ]
      },
      title: 'Theme',
      type: 'string'
    },
    {
      group: 'styles',
      name: 'sectionFields',
      title: 'Section Fields',
      type: 'sectionFields'
    }
  ],
  groups: defaultSectionGroups,
  icon: TbColumns2,
  name: 'twoColDefaultSection',
  preview: {
    prepare(selection) {
      return {
        subtitle: selection?.internalLabel,
        title: `Two Column - Simple`
      };
    },
    select: {
      internalLabel: 'internalLabel'
    }
  },
  title: 'Two Column - Simple',
  type: 'object'
});

const alignMedia = defineType({
  description: 'Choose whether to align the media (image, video, etc.) to the right or left of the content.',
  initialValue: 'right',
  name: 'alignMedia',
  options: {
    direction: 'horizontal',
    layout: 'radio',
    list: [
      { title: 'Left', value: 'left' },
      { title: 'Right', value: 'right' }
    ]
  },
  title: 'Align Media',
  type: 'string'
});

export { twoColDefaultSection, alignMedia };
export type { ITwoColumnDefaultSection };
