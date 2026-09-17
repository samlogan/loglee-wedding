import type { Person, WithContext } from 'schema-dts';

interface PersonProps {
  authorId: string;
  name: string;
  image?: string;
  jobTitle?: string;
  siteUrl: string | undefined;
}

const person = (props: PersonProps): WithContext<Person> => {
  const { authorId, name, image, jobTitle, siteUrl } = props;
  return {
    '@context': 'https://schema.org',
    '@id': `${siteUrl}/#person/${authorId}`,
    '@type': 'Person',
    name,
    ...(image ? { image: { '@type': 'ImageObject', url: image } } : {}),
    ...(jobTitle ? { jobTitle } : {}),
    worksFor: {
      '@id': `${siteUrl}/#organization`
    }
  };
};

export default person;
