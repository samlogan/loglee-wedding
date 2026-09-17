import type { WebPage, WithContext } from 'schema-dts';

interface WebPageArgs {
  documentTitle: string | undefined;
  documentDescription: string | undefined;
  documentDatePublished: string | undefined;
  documentDateModified: string | undefined;
  documentImage: string | undefined;
  siteName: string | undefined;
  siteLanguage: string;
  siteUrl: string | undefined;
  pathname: string;
  copyrightYear: number;
}

const webPage = (props: WebPageArgs): WithContext<WebPage> => {
  const {
    siteUrl,
    siteName,
    siteLanguage,
    documentTitle,
    documentDescription,
    documentDatePublished,
    documentDateModified,
    documentImage,
    pathname,
    copyrightYear
  } = props;

  const pageUrl = `${siteUrl}${pathname}`;
  const orgRef = { '@id': `${siteUrl}/#organization` } as const;
  const pageRef = { '@id': `${pageUrl}#webpage` } as const;

  return {
    '@context': 'https://schema.org',
    '@id': `${pageUrl}#webpage`,
    '@type': 'WebPage',
    author: orgRef,
    breadcrumb: {
      '@id': `${pageUrl}#breadcrumb`
    },
    copyrightHolder: orgRef,
    copyrightYear: copyrightYear,
    creator: orgRef,
    dateModified: documentDateModified,
    datePublished: documentDatePublished,
    description: documentDescription,
    headline: documentTitle,
    image: {
      '@type': 'ImageObject',
      url: documentImage
    },
    inLanguage: siteLanguage,
    isPartOf: {
      '@id': `${siteUrl}/#website`
    },
    mainEntityOfPage: pageRef,
    name: siteName
  };
};

export default webPage;
