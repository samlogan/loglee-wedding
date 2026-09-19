import { groq } from 'next-sanity';

import imageProjection from '@/tools/sanity/projections/common/image.groq';

/**
 * Gated on `mediaType`, because the Studio only *hides* the other branch — an editor who switches
 * from image to video leaves the image, asset reference and all, in the document. `!= 'video'`
 * rather than `== 'image'` so a section saved before the field had a value still reads as an image.
 */
const mediaSectionProjection = groq`
  _type == 'mediaSection' => {
    mediaType,
    mediaType != 'video' => {
      image${imageProjection}
    },
    mediaType == 'video' => {
      videoUrl,
      autoPlay
    },
    width,
    aspectRatioDesktop,
    aspectRatioMobile
  },
`;

export default mediaSectionProjection;
