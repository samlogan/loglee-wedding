import { groq } from 'next-sanity';

import blockContentProjection from '@/tools/sanity/projections/common/blockContent.groq';
import buttonProjection from '@/tools/sanity/projections/common/button.groq';
import imageProjection from '@/tools/sanity/projections/common/image.groq';

const gridSectionProjection = groq`
  _type == 'gridSection' => {
    tagline,
    title,
    content[]${blockContentProjection},
    cards[] {
      image${imageProjection},
      title,
      content[]${blockContentProjection},
      addButton,
      button${buttonProjection},
    }
  },
`;

export default gridSectionProjection;
