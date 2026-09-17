import { groq } from 'next-sanity';

const embedSectionProjection = groq`
  _type == 'embedSection' => {
    embed,
  },
`;

export default embedSectionProjection;
