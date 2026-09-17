import { groq } from 'next-sanity';

const linkProjection = groq`{
  linkType,
  internalLink->{
    title,
    slug,
    pathname
  },
  externalLink,
  phone,
  email,
  action
}`;

export default linkProjection;
