import { groq } from 'next-sanity';

import imageProjection from '@/tools/sanity/projections/common/image.groq';

const mediaSectionProjection = groq`
  _type == 'mediaSection' => {
    mediaType,
    image${imageProjection},
    videoUrl,
    thumbnail${imageProjection}
  },
`;

export default mediaSectionProjection;
