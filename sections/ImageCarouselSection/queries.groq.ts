import { groq } from 'next-sanity';

import imageProjection from '@/tools/sanity/projections/common/image.groq';

/**
 * `_key` for React's list key — editors reorder these. The image projection carries the asset's
 * pixel dimensions and the crop, which is what each slide's aspect ratio is computed from.
 */
const imageCarouselSectionProjection = groq`
  _type == 'imageCarouselSection' => {
    "images": select(
      useSharedPhotos == true => *[_type == "photoLibrary" && _id == "photoLibrary"][0].images[]{
        _key,
        ...@${imageProjection}
      },
      images[]{
        _key,
        ...@${imageProjection}
      }
    ),
    speed,
    shuffle
  },
`;

export default imageCarouselSectionProjection;
