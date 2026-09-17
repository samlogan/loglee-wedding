import { groq } from 'next-sanity';

import linkProjection from './link.groq';

const buttonProjection = groq`{
  label,
  link${linkProjection}
}`;

export default buttonProjection;
