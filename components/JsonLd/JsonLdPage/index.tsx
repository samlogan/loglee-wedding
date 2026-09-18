import metadata from '@/config/metadata';
import website from '@/config/website';
import { sanityFetch } from '@/tools/sanity/lib/fetch';
import { SOCIAL_MEDIA_QUERY } from '@/tools/sanity/lib/queries.groq';
import type { IPageDocument } from '@/tools/sanity/schema/documents/page';

import breadcrumbList from '../schemas/breadcrumbList';
import listItem from '../schemas/listItem';
import organization from '../schemas/organization';
import webPage from '../schemas/webPage';
import webSiteSchema from '../schemas/webSite';

interface JsonLdPageProps {
  document: IPageDocument;
}

const JsonLdPage = async (props: JsonLdPageProps) => {
  const { document } = props;

  const { _createdAt, _updatedAt, title, seoData } = document || {};

  // Site Data
  const siteName = website?.siteName;
  const siteDescription = website?.description;
  const siteLanguage = website?.siteLanguage;
  const siteUrl = website?.siteUrl;
  const socialMediaDocument = await sanityFetch<{ socials?: { name: string; link: string }[] }>({
    query: SOCIAL_MEDIA_QUERY
  });
  const siteSocials = socialMediaDocument?.socials?.map((social) => social.link).filter(Boolean) ?? [];

  // Document data
  const documentTitle = (document?.seoData?.seoTitle || document?.title || metadata?.title) as string | undefined;
  const documentDescription = (document?.seoData?.seoDescription || metadata?.description) as string | undefined;
  const fallbackDate = new Date(process.env.NEXT_PUBLIC_LAST_UPDATED_AT || new Date()).toISOString();
  const documentCreatedAt = new Date(document?._createdAt);
  const documentUpdatedAt = new Date(document?._updatedAt);
  const documentDatePublished = !isNaN(documentCreatedAt.getTime()) ? documentCreatedAt?.toISOString() : fallbackDate;
  const documentDateModified = !isNaN(documentUpdatedAt.getTime()) ? documentUpdatedAt?.toISOString() : fallbackDate;
  const ogImages = metadata?.openGraph?.images;
  const firstImage = Array.isArray(ogImages) ? ogImages?.[0] : ogImages;
  const documentImage = typeof firstImage === 'string' ? firstImage : (firstImage as { url?: string } | undefined)?.url;

  // `document` is optional-chained throughout because a `force-static` page whose CMS query
  // returns null still prerenders — an empty dataset is the state every fresh environment
  // starts in, and reading through a null here used to fail the production build.
  const pathname = (document?.pathname as string) || '/';
  const pageUrl = `${siteUrl}${pathname}`;

  // Copyright year from document creation, not current date
  const copyrightYear = !isNaN(documentCreatedAt.getTime())
    ? documentCreatedAt.getFullYear()
    : new Date().getFullYear();

  if (process.env.DEBUG_SEO_DATA === 'true') {
    console.log('__DEBUG_SEO_JSONLD', {
      _createdAt,
      _updatedAt,
      seoData,
      title
    });
  }

  const pageArgs = {
    copyrightYear,
    documentDateModified,
    documentDatePublished,
    documentDescription,
    documentImage,
    documentTitle,
    pathname,
    siteLanguage,
    siteName,
    siteUrl
  };
  const jsonLdSchema = webPage(pageArgs);

  const jsonLdOrganization = organization({
    siteDescription,
    siteName,
    siteSocials,
    siteUrl
  });

  const jsonLdWebSite = webSiteSchema({
    siteDescription,
    siteLanguage,
    siteName,
    siteUrl
  });

  // Build breadcrumbs: Home → (intermediate pages) → current page
  const breadcrumbItems = [
    listItem({
      item: `${siteUrl}/`,
      name: 'Home',
      position: 1
    })
  ];

  // Add intermediate breadcrumbs if the document has them
  if ('breadcrumbs' in document && Array.isArray(document.breadcrumbs)) {
    document.breadcrumbs.forEach((crumb, index) => {
      breadcrumbItems.push(
        listItem({
          item: `${siteUrl}${crumb.pathname}`,
          name: crumb.title,
          position: index + 2
        })
      );
    });
  }

  // Add current page as last crumb
  if (documentTitle && pathname !== '/') {
    breadcrumbItems.push(
      listItem({
        item: pageUrl,
        name: documentTitle,
        position: breadcrumbItems.length + 1
      })
    );
  }

  const jsonLdBreadcrumbList = breadcrumbList({
    itemListElement: breadcrumbItems,
    pageUrl
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrganization) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebSite) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumbList) }} />
    </>
  );
};

export default JsonLdPage;
