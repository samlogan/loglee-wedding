import { groq } from 'next-sanity';

import blockContentProjection from '@/tools/sanity/projections/common/blockContent.groq';
import buttonProjection from '@/tools/sanity/projections/common/button.groq';
import imageProjection from '@/tools/sanity/projections/common/image.groq';

const twoColDefaultSectionProjection = groq`
  _type == 'twoColDefaultSection' => {
    tagline,
    title,
    content[]${blockContentProjection},
    addButton,
    button${buttonProjection},
    image${imageProjection},
    alignMedia,
    theme,
  },
`;

export default twoColDefaultSectionProjection;
