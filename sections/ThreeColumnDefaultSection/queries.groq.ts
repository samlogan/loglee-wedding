import { groq } from 'next-sanity';

import blockContentProjection from '@/tools/sanity/projections/common/blockContent.groq';
import buttonProjection from '@/tools/sanity/projections/common/button.groq';
import imageProjection from '@/tools/sanity/projections/common/image.groq';

const threeColSectionProjection = groq`
  _type == 'threeColSection' => {
    tagline,
    title,
    content[]${blockContentProjection},
    featureCards[] {
      _key,
      image${imageProjection},
      title,
      content[]${blockContentProjection},
      addButton,
      button${buttonProjection},
    }
  },
`;

export default threeColSectionProjection;
