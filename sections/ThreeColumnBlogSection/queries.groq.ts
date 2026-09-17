import { groq } from 'next-sanity';

import blockContentProjection from '@/tools/sanity/projections/common/blockContent.groq';
import buttonProjection from '@/tools/sanity/projections/common/button.groq';
import imageProjection from '@/tools/sanity/projections/common/image.groq';

const threeColBlogSectionProjection = groq`
  _type == 'threeColBlogSection' => {
    title,
    content[]${blockContentProjection},
    addButton,
    button${buttonProjection},
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

export default threeColBlogSectionProjection;
