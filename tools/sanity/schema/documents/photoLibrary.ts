import { TbPhoto } from 'react-icons/tb';
import { defineType } from 'sanity';

/**
 * The shared photos — one list, used wherever an image carousel or a player's gallery has "Use the
 * shared photos" switched on (the homepage carousel, Sam's and Lauren's pages), so a photo is added
 * or removed in one place. One document, `photoLibrary`, under Global → Photos.
 */
interface IPhotoLibrary {
  _id: string;
  _type: 'photoLibrary';
  images?: (SanityImageSimple & { _key?: string })[];
}

const photoLibrary = defineType({
  fields: [
    {
      description:
        'Shown by every carousel and player gallery with “Use the shared photos” on. Each photo keeps close to its own shape as it scrolls — set the hotspot to keep faces in frame. Drag to reorder.',
      name: 'images',
      of: [{ type: 'imageElementSimple' }],
      options: { layout: 'grid' },
      title: 'Photos',
      type: 'array'
    }
  ],
  icon: TbPhoto,
  name: 'photoLibrary',
  preview: {
    prepare: ({ images }: { images?: unknown[] }) => ({
      subtitle: `${images?.length ?? 0} photos`,
      title: 'Photos'
    }),
    select: { images: 'images' }
  },
  title: 'Photos',
  type: 'document'
});

export default photoLibrary;
export type { IPhotoLibrary };
