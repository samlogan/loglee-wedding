import { groq } from 'next-sanity';

import blockContentProjection from '@/tools/sanity/projections/common/blockContent.groq';
import buttonProjection from '@/tools/sanity/projections/common/button.groq';

const faqSectionProjection = groq`
  _type == 'faqSection' => {
    tagline,
    title,
    content[]${blockContentProjection},
    addButton,
    button${buttonProjection},
    faqItems[]{
      question,
      answer[]${blockContentProjection}
    },
    button${buttonProjection}
  },
`;

export default faqSectionProjection;
