import type { SanityDocument } from 'next-sanity';
import { notFound } from 'next/navigation';

import metadata from '@/config/metadata';
import PageTemplate from '@/templates/PageTemplate';
import { generateSanityMetadata } from '@/tools/sanity/helpers';
import { client } from '@/tools/sanity/lib/client';
import { sanityFetch } from '@/tools/sanity/lib/fetch';
import { DOCUMENT_QUERY } from '@/tools/sanity/lib/queries.groq';

const Document = async (props: SanityPageProps) => {
  const params = await props.params;
  const slugArray = (params?.slug as string[]) || [];

  const pathname = `/${slugArray.join('/')}/`;
  const document = await sanityFetch<SanityDocument>({
    query: DOCUMENT_QUERY,
    tags: ['page'], // May change in the future to include other document types
    params: { pathname, types: ['page'] }
  });

  if (!document) {
    return notFound();
  }

  const documentType = document?._type;

  switch (documentType) {
    case 'page': {
      if (document?.page) {
        return <PageTemplate data={document?.page} params={params} />;
      }
      break;
    }
    default: {
      return notFound();
    }
  }
};

export const generateMetadata = generateSanityMetadata({
  query: async (params) => {
    const slugAsArray = (params?.slug as string[]) || [];
    const pathname = `/${slugAsArray.join('/')}/`;

    const document = await sanityFetch<SanityDocument>({
      params: { pathname, types: ['page'] },
      query: DOCUMENT_QUERY,
      tags: ['page']
    });

    const documentType = document?._type;

    const canonicalPath = slugAsArray.join('/');

    switch (documentType) {
      case 'page': {
        return {
          alternates: {
            canonical: `${process.env.NEXT_PUBLIC_SITE_URL}/${canonicalPath}/`
          },
          openGraphImage: document?.page?.seoData?.openGraphImage?.asset?.url,
          openGraphUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/${canonicalPath}/`,
          robots: document?.page?.seoData?.noIndex ? { googleBot: { index: false }, index: false } : undefined,
          seoDescription: document?.page?.seoData?.seoDescription,
          seoTitle: document?.page?.seoData?.seoTitle || `${document?.page?.title} | ${metadata.title}`
        };
      }
      default: {
        return {
          seoDescription: '',
          seoKeywords: [],
          seoTitle: `${metadata.title}`
        };
      }
    }
  }
});

export const generateStaticParams = async () => {
  const pathnames: SanityDocument[] = await client.fetch(
    `*[_type in $types && defined(pathname) && !(_id in path("drafts.**")) && pathname != '/']{ pathname }`,
    { types: ['page'] }
  );
  return pathnames.map((doc) => ({ slug: doc.pathname.split('/').filter(Boolean) }));
};

export const dynamic = 'force-static';

export default Document;
