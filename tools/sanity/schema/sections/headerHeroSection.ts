import { FiStar } from 'react-icons/fi';
import { defineType } from 'sanity';

import thumbnail from '../../../../sections/HeaderHeroSection/thumbnail.png';
import ReadOnlyImageInput from '../../components/ReadOnlyImageInput';
import stripTitleTags from '../../helpers/stripTitleTags';
import defaultSectionGroups from '../common/defaultSectionGroups';
import internalLabelField from '../common/internalLabelField';
import type { IButtonElement } from '../elements/button';

interface IHeaderHeroSection {
  tagline: string;
  title: string;
  content: SanityTextBlock[];
  addButton: boolean;
  button: IButtonElement;
  image: SanityImage;
}

const headerHeroSection = defineType({
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
      type: 'string'
    },
    {
      group: 'data',
      name: `content`,
      title: `Content`,
      type: `blockContentSimple`
    },
    {
      group: 'data',
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
    }
  ],
  groups: defaultSectionGroups,
  icon: FiStar,
  name: 'headerHeroSection',
  preview: {
    prepare(selection) {
      return {
        subtitle: selection?.internalLabel || stripTitleTags(selection?.title),
        title: `Header - Hero`
      };
    },
    select: {
      internalLabel: 'internalLabel',
      title: 'title'
    }
  },
  title: 'Header - Hero',
  type: 'object'
});

export default headerHeroSection;
export type { IHeaderHeroSection };
