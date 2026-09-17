import { groq } from 'next-sanity';

const seoDataProjection = groq`{
  ...,
  openGraphImage {
    asset->{
      url,
    }
  }
}`;

export default seoDataProjection;
