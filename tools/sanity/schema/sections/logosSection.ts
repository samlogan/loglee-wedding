import { TbDots } from 'react-icons/tb';
import { defineType } from 'sanity';

import thumbnail from '../../../../sections/LogosSection/thumbnail.png';
import ReadOnlyImageInput from '../../components/ReadOnlyImageInput';
import stripTitleTags from '../../helpers/stripTitleTags';
import defaultSectionGroups from '../common/defaultSectionGroups';
import internalLabelField from '../common/internalLabelField';

interface ILogosSection {
  useGlobalComponent: boolean;
  globalComponent?: Record<string, unknown>;
  title: string;
  images: SanityImage[];
}

const logosSection = defineType({
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
      description: `Choose whether to use a global component instead of building a local component.`,
      group: 'data',
      hidden: ({ document }) => document?._type === 'globalLogos',
      initialValue: false,
      name: 'useGlobalComponent',
      title: 'Use global component?',
      type: 'boolean'
    },
    {
      group: 'data',
      hidden: ({ parent }) => parent?.useGlobalComponent !== true,
      name: 'globalComponent',
      title: 'Global Component',
      to: [{ type: 'globalLogos' }],
      type: 'reference'
    },
    {
      group: 'data',
      name: 'title',
      title: 'Title',
      type: 'title'
    },
    {
      description: "Will default to Global Fields' logos if left empty.",
      group: 'data',
      name: 'images',
      of: [{ type: 'imageElementSimple' }],
      title: 'Logo Images',
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
  icon: TbDots,
  name: 'logosSection',
  preview: {
    prepare(selection) {
      return {
        subtitle: selection?.internalLabel || stripTitleTags(selection?.title),
        title: `Logos`
      };
    },
    select: {
      internalLabel: 'internalLabel',
      title: 'title'
    }
  },
  title: 'Logos',
  type: 'object'
});

export default logosSection;
export type { ILogosSection };
