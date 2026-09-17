import { TbBaselineDensityLarge } from 'react-icons/tb';
import { defineType } from 'sanity';

import thumbnail from '../../../../sections/HeaderSimpleSection/thumbnail.png';
import ReadOnlyImageInput from '../../components/ReadOnlyImageInput';
import stripTitleTags from '../../helpers/stripTitleTags';
import defaultSectionGroups from '../common/defaultSectionGroups';
import internalLabelField from '../common/internalLabelField';

interface IHeaderSimpleSection {
  tagline?: string;
  title?: string;
  content?: SanityTextBlock[];
}

const headerSimpleSection = defineType({
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
    }
  ],
  groups: defaultSectionGroups,
  icon: TbBaselineDensityLarge,
  name: 'headerSimpleSection',
  preview: {
    prepare(selection) {
      return {
        subtitle: selection?.internalLabel || stripTitleTags(selection?.title),
        title: `Header - Simple`
      };
    },
    select: {
      internalLabel: 'internalLabel',
      title: 'title'
    }
  },
  title: 'Header - Simple',
  type: 'object'
});

export default headerSimpleSection;
export type { IHeaderSimpleSection };
