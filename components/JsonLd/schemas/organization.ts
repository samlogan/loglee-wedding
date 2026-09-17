import type { Organization, WithContext } from 'schema-dts';

interface OrganizationProps {
  siteName: string;
  siteUrl: string | undefined;
  siteDescription: string;
  siteSocials: string[];
}

const organizationSchema = (props: OrganizationProps): WithContext<Organization> => {
  const { siteUrl, siteName, siteDescription, siteSocials } = props;
  return {
    '@context': 'https://schema.org',
    '@id': `${siteUrl}/#organization`,
    '@type': 'Organization',
    description: siteDescription,
    legalName: siteName,
    logo: {
      '@type': 'ImageObject',
      height: '512',
      url: `${siteUrl}/schema-icon.png`,
      width: '512'
    },
    name: siteName,
    sameAs: siteSocials || [],
    url: `${siteUrl}/`
  };
};

export default organizationSchema;
