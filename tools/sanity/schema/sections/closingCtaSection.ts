import { TbClick } from 'react-icons/tb';
import { defineType } from 'sanity';

import thumbnail from '../../../../sections/ClosingCtaSection/thumbnail.png';
import ReadOnlyImageInput from '../../components/ReadOnlyImageInput';
import stripTitleTags from '../../helpers/stripTitleTags';
import defaultSectionGroups from '../common/defaultSectionGroups';
import internalLabelField from '../common/internalLabelField';
import type { IButtonElement } from '../elements/button';

interface IClosingCtaSection {
  title: string;
  content: SanityTextBlock[];
  addButton?: boolean;
  button?: IButtonElement;
}

const closingCtaSection = defineType({
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
      name: `title`,
      title: `Title`,
      type: 'string'
    },
    {
      group: 'data',
      name: `content`,
      title: `Content`,
      type: 'blockContentSimple'
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
      group: 'styles',
      name: 'sectionFields',
      title: 'Section Fields',
      type: 'sectionFields'
    }
  ],
  groups: defaultSectionGroups,
  icon: TbClick,
  name: 'closingCtaSection',
  preview: {
    prepare(selection) {
      return {
        subtitle: selection?.internalLabel || stripTitleTags(selection?.title),
        title: `Closing Cta`
      };
    },
    select: {
      internalLabel: 'internalLabel',
      title: 'title'
    }
  },
  title: 'Closing Cta',
  type: 'object'
});

export default closingCtaSection;
export type { IClosingCtaSection };
