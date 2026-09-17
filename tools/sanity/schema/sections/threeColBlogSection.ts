import { TbAlignBoxLeftMiddle } from 'react-icons/tb';
import { defineType } from 'sanity';

import ReadOnlyImageInput from '../../components/ReadOnlyImageInput';
import defaultSectionGroups from '../common/defaultSectionGroups';
import internalLabelField from '../common/internalLabelField';
import type { IButtonElement } from '../elements/button';
// import thumbnail from '../../../../sections/ThreeColumnBlogSection/thumbnail.png';

/** Matches the shared `featureCard` element type in `tools/sanity/schema/elements/featureCard.ts`. */
interface IFeatureCard {
  /** Sanity array-item key. Projected so lists have a stable identity that survives reordering. */
  _key: string;
  image: SanityImage;
  title: string;
  content: SanityTextBlock[];
  addButton: boolean;
  /** Null when `addButton` is false — the schema hides the field, so the projection returns null. */
  button: IButtonElement | null;
}

interface IThreeColBlogSection {
  title: string;
  content: SanityTextBlock[];
  addButton: boolean;
  button: IButtonElement;
  featureCards: IFeatureCard[];
}

const threeColBlogSection = defineType({
  fields: [
    internalLabelField,
    {
      name: 'sectionPreview',
      title: 'Section Preview',
      type: 'image',
      components: { input: ReadOnlyImageInput },
      // imageUrl: thumbnail.src,
      readOnly: true,
      group: 'internal'
    },
    {
      group: 'data',
      name: `title`,
      title: `Title`,
      type: `string`
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
      name: 'featureCards',
      of: [{ type: 'featureCard' }],
      title: 'Feature Cards',
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
  icon: TbAlignBoxLeftMiddle,
  name: 'threeColBlogSection',
  preview: {
    prepare(selection) {
      return {
        subtitle: selection?.internalLabel,
        title: `Three Column - Blog`
      };
    },
    select: {
      internalLabel: 'internalLabel'
    }
  },
  title: 'Three Column - Blog',
  type: 'object'
});

export default threeColBlogSection;
export type { IThreeColBlogSection };
