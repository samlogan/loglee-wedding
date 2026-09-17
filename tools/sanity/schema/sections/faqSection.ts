import { MdQuestionAnswer } from 'react-icons/md';
import { defineType } from 'sanity';

import thumbnail from '../../../../sections/FaqSection/thumbnail.png';
import ReadOnlyImageInput from '../../components/ReadOnlyImageInput';
import defaultSectionGroups from '../common/defaultSectionGroups';
import internalLabelField from '../common/internalLabelField';
import type { IButtonElement } from '../elements/button';

interface IFaqSection {
  tagline?: string;
  title?: string;
  content?: SanityTextBlock[];
  addButton: boolean;
  button?: IButtonElement;
  faqItems: {
    question: string;
    answer: SanityTextBlock[];
  }[];
}

const faqSection = defineType({
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
      type: 'blockContentStandard'
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
      name: 'faqItems',
      of: [
        {
          fields: [
            {
              name: 'question',
              title: 'Question',
              type: 'string'
            },
            {
              name: 'answer',
              title: 'Answer',
              type: 'blockContentStandard'
            }
          ],
          name: 'faqItem',
          title: 'FAQ Item',
          type: 'object'
        }
      ],
      title: 'FAQ Items',
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
  icon: MdQuestionAnswer,
  name: 'faqSection',
  preview: {
    prepare() {
      return {
        title: `FAQ Section`
      };
    }
  },
  title: 'FAQ',
  type: 'object'
});

export { faqSection };
export type { IFaqSection };
