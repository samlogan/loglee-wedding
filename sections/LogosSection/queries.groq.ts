import { groq } from 'next-sanity';

import imageProjection from '@/tools/sanity/projections/common/image.groq';

const logosSectionProjection = groq`
  _type == 'logosSection' => {
    useGlobalComponent,
    title,
    images[]${imageProjection}
  },
`;

export default logosSectionProjection;
