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
  /** From the projection: the shared photos when `useSharedPhotos` is on, the section's own otherwise. */
  images?: (SanityImageSimple & { _key?: string })[] | null;
  useSharedPhotos?: boolean | null;
  speed?: 'slow' | 'medium' | 'fast' | null;
  /** Pick up to 12 at random each visit. Off: every photo, in the order above. Unset counts as on. */
  shuffle?: boolean | null;
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
        'On: show the shared photos from Global → Photos — edit them once, and every carousel and player gallery using them updates. Off: the images below.',
      group: 'data',
      initialValue: false,
      name: 'useSharedPhotos',
      title: 'Use the shared photos',
      type: 'boolean'
    },
    {
      description:
        'Each photo keeps close to its own shape, nudged so no two neighbours match — set the hotspot to keep the subject in frame. Drag to reorder. At least three reads as a strip rather than a repeat.',
      group: 'data',
      hidden: ({ parent }) => parent?.useSharedPhotos === true,
      name: 'images',
      of: [{ type: 'imageElementSimple' }],
      options: { layout: 'grid' },
      title: 'Images',
      type: 'array',
      // Only while the section uses its own images; with the shared photos on, this list is unused.
      validation: (Rule) => [
        Rule.custom((images: unknown[] | undefined, { parent }) =>
          (parent as { useSharedPhotos?: boolean })?.useSharedPhotos || (images?.length ?? 0) >= 2
            ? true
            : 'Add at least two images, or use the shared photos.'
        ),
        Rule.custom((images: unknown[] | undefined, { parent }) =>
          (parent as { useSharedPhotos?: boolean })?.useSharedPhotos || (images?.length ?? 0) !== 2
            ? true
            : 'With fewer than three, the same photos come round again quickly.'
        ).warning()
      ]
    },
    {
      description:
        'On: up to 12 of the photos, picked and shuffled for each visit. Off: every photo, in the order above.',
      group: 'data',
      initialValue: true,
      name: 'shuffle',
      title: 'Shuffle Photos',
      type: 'boolean'
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
