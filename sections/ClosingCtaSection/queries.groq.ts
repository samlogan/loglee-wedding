import { groq } from 'next-sanity';

import blockContentProjection from '@/tools/sanity/projections/common/blockContent.groq';
import buttonProjection from '@/tools/sanity/projections/common/button.groq';

const closingCtaSectionProjection = groq`
  _type == 'closingCtaSection' => {
    title,
    content[]${blockContentProjection},
    addButton,
    button${buttonProjection}
  },
`;

export default closingCtaSectionProjection;
