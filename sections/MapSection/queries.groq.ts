import { groq } from 'next-sanity';

/**
 * `location` is narrowed to the three numbers the map reads, rather than projected whole — a
 * geopoint also carries `_type` and `alt`, which nothing here uses.
 */
const mapSectionProjection = groq`
  _type == 'mapSection' => {
    location{ lat, lng, zoom },
    label,
    aspectRatioDesktop,
    aspectRatioMobile
  },
`;

export default mapSectionProjection;
