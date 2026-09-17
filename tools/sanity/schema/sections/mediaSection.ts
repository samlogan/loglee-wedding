import { TbMovie } from 'react-icons/tb';
import { defineType } from 'sanity';

import ReadOnlyImageInput from '../../components/ReadOnlyImageInput';
import VideoUrlInput from '../../components/VideoUrlInput';
import defaultSectionGroups from '../common/defaultSectionGroups';
import internalLabelField from '../common/internalLabelField';
// import thumbnail from '../../../../sections/MediaSection/thumbnail.png';

interface IMediaSection {
  mediaType: 'image' | 'video';
  image: SanityImage;
  videoUrl: string;
  thumbnail: SanityImage;
}

const mediaSection = defineType({
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
      initialValue: 'image',
      name: 'mediaType',
      options: {
        direction: 'horizontal',
        layout: 'radio',
        list: [
          { value: 'image', title: 'Image' },
          { value: 'video', title: 'Video' }
        ]
      },
      title: 'Media Type',
      type: 'string'
    },
    {
      group: 'data',
      hidden: ({ parent }) => parent?.mediaType !== 'image',
      name: `image`,
      title: `Image`,
      type: `imageElementSimple`
    },
    {
      components: {
        input: VideoUrlInput,
        // @ts-expect-error
        options: {
          thumbnailField: 'thumbnail'
        }
      },
      group: 'data',
      hidden: ({ parent }) => parent?.mediaType !== 'video',
      name: `videoUrl`,
      placeholder: `https://...`,
      title: `Video URL (Vimeo, YouTube, etc.)`,
      type: `url`
    },
    {
      group: 'data',
      hidden: ({ parent }) => parent?.mediaType !== 'video',
      name: 'thumbnail',
      title: 'Thumbnail',
      type: 'image'
    },
    {
      group: 'styles',
      name: 'sectionFields',
      title: 'Section Fields',
      type: 'sectionFields'
    }
  ],
  groups: defaultSectionGroups,
  icon: TbMovie,
  name: 'mediaSection',
  preview: {
    prepare(selection) {
      return {
        subtitle:
          selection?.internalLabel || `${selection?.mediaType.charAt(0).toUpperCase()}${selection?.mediaType.slice(1)}`,
        title: `Media`
      };
    },
    select: {
      internalLabel: 'internalLabel',
      mediaType: 'mediaType',
      title: 'title'
    }
  },
  title: 'Media',
  type: 'object'
});

export default mediaSection;
export type { IMediaSection };
