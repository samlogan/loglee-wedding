import website from '@/config/website';
import { sanityFetch } from '@/tools/sanity/lib/fetch';
import { SOCIAL_MEDIA_QUERY } from '@/tools/sanity/lib/queries.groq';
import type { IBlogPostDocument } from '@/tools/sanity/schema/documents/blogPost';

import blogPosting from '../schemas/blogPosting';
import breadcrumbList from '../schemas/breadcrumbList';
import listItem from '../schemas/listItem';
import organization from '../schemas/organization';
import person from '../schemas/person';
import webPage from '../schemas/webPage';
import webSiteSchema from '../schemas/webSite';

interface JsonLdProps {
  document: IBlogPostDocument;
}

const JsonLdArticle = async (props: JsonLdProps) => {
  const { document } = props;

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
  const documentSeo = document?.seoData;
  const documentTitle = documentSeo?.seoTitle || document?.title;
  const documentDescription = documentSeo?.seoDescription || document?.tagline;
  const documentCreatedAt = document?._createdAt;
  const documentUpdatedAt = new Date(document?._updatedAt)?.toISOString();
  const documentDatePublished = document?.publishDate
    ? new Date(document.publishDate).toISOString()
    : documentCreatedAt
      ? new Date(documentCreatedAt).toISOString()
      : undefined;
  const documentDateModified = documentUpdatedAt ? new Date(documentUpdatedAt)?.toISOString() : undefined;
  const documentImage = documentSeo?.openGraphImage?.asset?.url || `${siteUrl}${website?.banner}`;
  const pathname = document?.pathname || document?.slug?.current || '';
  const documentUrl = `${siteUrl}${pathname}`;
  const copyrightYear = documentCreatedAt ? new Date(documentCreatedAt).getFullYear() : new Date().getFullYear();

  // Categories → articleSection (array)
  const articleSection = document?.categories?.map((category) => category.title).filter(Boolean) ?? [];

  // Author → Person
  const author = document?.author;
  const authorName = author ? `${author.firstName ?? ''} ${author.lastName ?? ''}`.trim() : '';
  const authorImage = author?.image?.asset?.url;
  const jsonLdPerson =
    author && authorName
      ? person({
          authorId: author._id,
          image: authorImage,
          jobTitle: author.role,
          name: authorName,
          siteUrl
        })
      : null;

  const jsonLdBlogPosting = blogPosting({
    articleSection,
    authorId: author?._id,
    documentDateModified,
    documentDatePublished,
    documentDescription,
    documentImage,
    documentTitle,
    documentUrl,
    siteUrl
  });

  const jsonLdWebPage = webPage({
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
  });

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

  // Breadcrumbs: Home → Blog → Article
  const jsonLdBreadcrumbList = breadcrumbList({
    itemListElement: [
      listItem({
        item: `${siteUrl}/`,
        name: 'Home',
        position: 1
      }),
      listItem({
        item: `${siteUrl}/blog/`,
        name: 'Blog',
        position: 2
      }),
      listItem({
        item: documentUrl,
        name: documentTitle,
        position: 3
      })
    ],
    pageUrl: documentUrl
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebPage) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBlogPosting) }} />
      {jsonLdPerson && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdPerson) }} />
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrganization) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebSite) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumbList) }} />
    </>
  );
};

export default JsonLdArticle;
