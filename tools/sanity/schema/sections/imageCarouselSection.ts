import { TbSlideshow } from 'react-icons/tb';
import { defineType } from 'sanity';

import thumbnail from '../../../../sections/ImageCarouselSection/thumbnail.png';
import ReadOnlyImageInput from '../../components/ReadOnlyImageInput';
import defaultSectionGroups from '../common/defaultSectionGroups';
import internalLabelField from '../common/internalLabelField';

/**
 * A strip of photographs scrolling slowly and continuously across the page, each cropped close to its
 * own shape but never the same as its neighbours. No controls — it moves on its own.
 */
interface IImageCarouselSection {
  images?: (SanityImageSimple & { _key?: string })[] | null;
  speed?: 'slow' | 'medium' | 'fast' | null;
}

const imageCarouselSection = defineType({
  fields: [
    internalLabelField,
    {
      name: 'sectionPreview',
      title: 'Section Preview',
      type: 'image',
      components: { input: ReadOnlyImageInput },
      // @ts-expect-error -- `imageUrl` is read by ReadOnlyImageInput, not by Sanity's image type
      imageUrl: thumbnail.src,
      readOnly: true,
      group: 'internal'
    },
    {
      description:
        'Each photo keeps close to its own shape, nudged so no two neighbours match — set the hotspot to keep the subject in frame. Drag to reorder. At least three reads as a strip rather than a repeat.',
      group: 'data',
      name: 'images',
      of: [{ type: 'imageElementSimple' }],
      options: { layout: 'grid' },
      title: 'Images',
      type: 'array',
      validation: (Rule) => [
        Rule.required().min(2).error('Add at least two images.'),
        Rule.min(3).warning('With fewer than three, the same photos come round again quickly.')
      ]
    },
    {
      description: 'How quickly the strip moves.',
      group: 'styles',
      initialValue: 'medium',
      name: 'speed',
      options: {
        direction: 'horizontal' as const,
        layout: 'radio' as const,
        list: [
          { title: 'Slow', value: 'slow' },
          { title: 'Medium', value: 'medium' },
          { title: 'Fast', value: 'fast' }
        ]
      },
      title: 'Speed',
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
  icon: TbSlideshow,
  name: 'imageCarouselSection',
  preview: {
    prepare(selection: { images?: unknown[]; internalLabel?: string; media?: unknown }) {
      const count = selection?.images?.length ?? 0;

      return {
        media: selection?.media as never,
        subtitle: selection?.internalLabel || `${count} image${count === 1 ? '' : 's'}`,
        title: 'Image Carousel'
      };
    },
    select: {
      images: 'images',
      internalLabel: 'internalLabel',
      media: 'images.0'
    }
  },
  title: 'Image Carousel',
  type: 'object'
});

export { imageCarouselSection };
export type { IImageCarouselSection };
