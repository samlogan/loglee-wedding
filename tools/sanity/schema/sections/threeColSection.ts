import { TbNumber3 } from 'react-icons/tb';
import { defineType } from 'sanity';

import ReadOnlyImageInput from '../../components/ReadOnlyImageInput';
import defaultSectionGroups from '../common/defaultSectionGroups';
import internalLabelField from '../common/internalLabelField';
import type { IButtonElement } from '../elements/button';
// import thumbnail from '../../../../sections/ThreeColumnDefaultSection/thumbnail.png';

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

interface IThreeColSection {
  tagline: string;
  title: string;
  content: SanityTextBlock[];
  featureCards: IFeatureCard[];
}

const threeColSection = defineType({
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
      name: 'featureCards',
      of: [{ type: 'featureCard' }],
      title: 'Feature Cards',
      type: 'array'
      // validation: (Rule) =>
      //   Rule.custom((cards) => {
      //     if (cards.length % 3 !== 0) {
      //       return 'Number of cards must be divisible by 3';
      //     }
      //   }),
    },
    {
      group: 'styles',
      name: 'sectionFields',
      title: 'Section Fields',
      type: 'sectionFields'
    }
  ],
  groups: defaultSectionGroups,
  icon: TbNumber3,
  name: 'threeColSection',
  preview: {
    prepare(selection) {
      return {
        subtitle: selection?.internalLabel,
        title: `Three Column - Simple`
      };
    },
    select: {
      internalLabel: 'internalLabel'
    }
  },
  title: 'Three Column - Simple',
  type: 'object'
});

export default threeColSection;
export type { IThreeColSection };
