import { TbPhotoVideo } from 'react-icons/tb';
import { defineType } from 'sanity';

import thumbnail from '../../../../sections/MediaSection/thumbnail.png';
import detectVideoPlatform from '../../../helpers/videoPlatform';
import ReadOnlyImageInput from '../../components/ReadOnlyImageInput';
import { aspectRatioFields } from '../common/aspectRatioFields';
import type { IAspectRatioFields } from '../common/aspectRatioFields';
import defaultSectionGroups from '../common/defaultSectionGroups';
import internalLabelField from '../common/internalLabelField';

/**
 * One photograph or one video, edge to edge, at an editor-chosen shape per viewport.
 *
 * `mediaType` picks the branch rather than the component inferring it from which field is filled —
 * an editor who switches an image section to video would otherwise keep seeing the image until they
 * found and cleared it. The projection gates on the same value, so the unused branch's fields stay
 * off the wire.
 */
interface IMediaSection extends IAspectRatioFields {
  mediaType?: 'image' | 'video' | null;
  image?: SanityImageSimple | null;
  /**
   * No separate title field: YouTube and Vimeo title their own embed frame with the video's name,
   * inside the player's shadow root, where a title passed from here does not reach.
   */
  videoUrl?: string | null;
  autoPlay?: boolean | null;
}

const isVideo = (context: { parent?: unknown }) =>
  (context.parent as { mediaType?: string } | undefined)?.mediaType === 'video';

/*
 * The two field validators below are exported for their unit test only — `export const`, not names
 * in the `export { … }` list at the foot, which is where `yarn sections:register` looks for sub-types
 * it would have to warn about.
 */

/** An image section needs an image. A video section does not, even with one left in the document. */
export const validateMediaImage = (value: unknown, context: { parent?: unknown }): true | string =>
  isVideo(context) || value ? true : 'Add an image, or switch to video.';

/**
 * A video section needs a link the player can play — YouTube or Vimeo. An image section ignores
 * whatever is left in the field, which the projection does not fetch anyway.
 */
export const validateVideoUrl = (value: unknown, context: { parent?: unknown }): true | string => {
  if (!isVideo(context)) {
    return true;
  }
  if (typeof value !== 'string' || !value.trim()) {
    return 'Add a YouTube or Vimeo link, or switch to image.';
  }
  return detectVideoPlatform(value) === 'unknown' ? 'Only YouTube and Vimeo links are supported.' : true;
};

const mediaSection = defineType({
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
      group: 'data',
      initialValue: 'image',
      name: 'mediaType',
      options: {
        direction: 'horizontal' as const,
        layout: 'radio' as const,
        list: [
          { title: 'Image', value: 'image' },
          { title: 'Video', value: 'video' }
        ]
      },
      title: 'Media Type',
      type: 'string'
    },
    {
      description: 'Cropped to fill the frame — set the hotspot to keep the subject in shot on every screen shape.',
      group: 'data',
      hidden: (context) => isVideo(context),
      name: 'image',
      title: 'Image',
      type: 'imageElementSimple',
      validation: (Rule) => Rule.custom(validateMediaImage)
    },
    {
      description: 'A YouTube or Vimeo link — the address bar, the share link or an embed link all work.',
      group: 'data',
      hidden: (context) => !isVideo(context),
      name: 'videoUrl',
      title: 'Video URL',
      type: 'url',
      validation: (Rule) => Rule.custom(validateVideoUrl)
    },
    {
      description:
        'Play automatically, muted and on a loop, like a moving photograph. The player controls stay available so it can be paused or unmuted.',
      group: 'data',
      hidden: (context) => !isVideo(context),
      initialValue: false,
      name: 'autoPlay',
      title: 'Autoplay (muted, looping)',
      type: 'boolean'
    },
    ...aspectRatioFields({ desktop: 'fullscreen', mobile: '4x5' }),
    {
      group: 'styles',
      name: 'sectionFields',
      title: 'Section Fields',
      type: 'sectionFields'
    }
  ],
  groups: defaultSectionGroups,
  icon: TbPhotoVideo,
  name: 'mediaSection',
  preview: {
    prepare(selection: { internalLabel?: string; media?: unknown; mediaType?: string; videoUrl?: string }) {
      const isVideoType = selection?.mediaType === 'video';

      return {
        media: isVideoType ? undefined : (selection?.media as never),
        subtitle: selection?.internalLabel || (isVideoType ? selection?.videoUrl || 'Video' : 'Image'),
        title: 'Media Section'
      };
    },
    select: {
      internalLabel: 'internalLabel',
      media: 'image',
      mediaType: 'mediaType',
      videoUrl: 'videoUrl'
    }
  },
  title: 'Media',
  type: 'object'
});

export { mediaSection };
export type { IMediaSection };
