import { groq } from 'next-sanity';

import blockContentProjection from '@/tools/sanity/projections/common/blockContent.groq';

// `items` is an array of plain strings, so it projects as-is — there is no sub-projection to apply
// and naming the field is enough to pull it through.
const headerDisplaySectionProjection = groq`
  _type == 'headerDisplaySection' => {
    title,
    content[]${blockContentProjection},
    items
  },
`;

export default headerDisplaySectionProjection;
