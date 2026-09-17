import { groq } from 'next-sanity';

import blockContentProjection from '@/tools/sanity/projections/common/blockContent.groq';
import buttonProjection from '@/tools/sanity/projections/common/button.groq';
import imageProjection from '@/tools/sanity/projections/common/image.groq';

const headerHeroSectionProjection = groq`
  _type == 'headerHeroSection' => {
    tagline,
    title,
    content[]${blockContentProjection},
    addButton,
    button${buttonProjection},
    image${imageProjection}
  },
`;

export default headerHeroSectionProjection;
