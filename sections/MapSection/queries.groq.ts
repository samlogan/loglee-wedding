import { groq } from 'next-sanity';

import blockContentProjection from '@/tools/sanity/projections/common/blockContent.groq';
import buttonProjection from '@/tools/sanity/projections/common/button.groq';

/**
 * `location` is narrowed to the three numbers the map reads, rather than projected whole — a
 * geopoint also carries `_type` and `alt`, which nothing here uses.
 */
const mapSectionProjection = groq`
  _type == 'mapSection' => {
    title,
    content[]${blockContentProjection},
    location{ lat, lng, zoom },
    badge,
    address,
    link${buttonProjection},
    label,
    width,
    aspectRatioDesktop,
    aspectRatioMobile
  },
`;

export default mapSectionProjection;
