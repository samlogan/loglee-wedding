import { groq } from 'next-sanity';

import blockContentProjection from '@/tools/sanity/projections/common/blockContent.groq';

const headerSimpleSectionProjection = groq`
  _type == 'headerSimpleSection' => {
    tagline,
    title,
    content[]${blockContentProjection},
  },
`;

export default headerSimpleSectionProjection;
