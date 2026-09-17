import type { WebSite, WithContext } from 'schema-dts';

interface WebSiteProps {
  siteName: string;
  siteUrl: string | undefined;
  siteDescription: string;
  siteLanguage: string;
}

const webSiteSchema = (props: WebSiteProps): WithContext<WebSite> => {
  const { siteName, siteUrl, siteDescription, siteLanguage } = props;
  return {
    '@context': 'https://schema.org',
    '@id': `${siteUrl}/#website`,
    '@type': 'WebSite',
    description: siteDescription,
    inLanguage: siteLanguage,
    name: siteName,
    publisher: {
      '@id': `${siteUrl}/#organization`
    },
    url: `${siteUrl}/`
  };
};

export default webSiteSchema;
