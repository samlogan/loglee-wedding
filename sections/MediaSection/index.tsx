import type { FC } from 'react';

import AspectRatioFrame from '@/components/AspectRatioFrame';
import Image from '@/components/Image';
import Section from '@/components/Section';
import Video from '@/components/Video';
import stringClean from '@/helpers/stringClean';
import detectVideoPlatform from '@/helpers/videoPlatform';
import { getSectionSpacingProps, getSectionTheme } from '@/tools/helpers/section';
import type { IMediaSection } from '@/tools/sanity/schema/sections/mediaSection';

/**
 * One image or one YouTube / Vimeo video, edge to edge of the viewport, in an `AspectRatioFrame` —
 * the same editor-chosen desktop / mobile pair `MapSection` uses.
 *
 * The image is cropped to fill the frame around its hotspot. The video letterboxes inside it on
 * black, because cropping a player would crop its controls.
 *
 * Nothing to show — no image, or a link that is not YouTube or Vimeo — renders nothing, rather than
 * an empty band or `Video`'s "unsupported" message on a live page.
 */
const MediaSection: FC<IMediaSection> = (props) => {
  const { aspectRatioDesktop, aspectRatioMobile, autoPlay, image, mediaType, videoUrl } = props;

  // `stringClean`, because in draft mode a stega payload rides on every string — the URL included.
  const isVideo = stringClean(mediaType ?? '') === 'video';
  const url = stringClean(videoUrl ?? '');
  const hasVideo = isVideo && detectVideoPlatform(url) !== 'unknown';
  // `asset?.url`, because a cleared image field projects as a truthy object with a null asset.
  const hasImage = !isVideo && Boolean(image?.asset?.url);

  if (!(hasVideo || hasImage)) {
    return null;
  }

  return (
    <Section full name="MediaSection" theme={getSectionTheme(props, 'light')} {...getSectionSpacingProps(props)}>
      <AspectRatioFrame desktop={aspectRatioDesktop} mobile={aspectRatioMobile}>
        {/*
         * No `fill`: `ImageSanity` always passes a width, and next/image rejects both. The container
         * is already `height: 100%` with the image `object-fit: cover` inside it, which is how the
         * FAQ map card fills its frame too.
         */}
        {hasImage && image && <Image {...image} sizes="100vw" />}
        {hasVideo && <Video ambient={Boolean(autoPlay)} fill url={url} />}
      </AspectRatioFrame>
    </Section>
  );
};

export default MediaSection;
