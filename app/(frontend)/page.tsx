import type { SanityDocument } from 'next-sanity';
import { notFound } from 'next/navigation';

import PageTemplate from '@/templates/PageTemplate';
import { generateSanityMetadata } from '@/tools/sanity/helpers';
import { sanityFetch } from '@/tools/sanity/lib/fetch';
import { DOCUMENT_QUERY } from '@/tools/sanity/lib/queries.groq';

const Home = async (props: SanityPageProps) => {
  const params = await props.params;

  const document = await sanityFetch<SanityDocument>({
    params: { pathname: '/', types: ['page'] },
    query: DOCUMENT_QUERY,
    tags: ['page', 'homepage']
  });

  if (!document) {
    return notFound();
  }

  return <PageTemplate data={document?.page} params={params} />;
};

export const generateMetadata = generateSanityMetadata({
  query: async () => {
    const document = await sanityFetch<SanityDocument>({
      params: { pathname: '/', types: ['page'] },
      query: DOCUMENT_QUERY,
      tags: ['page', 'homepage']
    });

    const page = document?.page;

    const canonicalPath = `${process.env.NEXT_PUBLIC_SITE_URL}/`;

    return {
      alternates: {
        canonical: canonicalPath
      },
      openGraphImage: document?.page?.seoData?.openGraphImage?.asset?.url,
      openGraphUrl: canonicalPath,
      robots: page?.seoData?.noIndex ? { googleBot: { index: false }, index: false } : undefined,
      seoDescription: page?.seoData?.seoDescription,
      seoTitle: page?.seoData?.seoTitle
    };
  }
});

export const dynamic = 'force-static';

export default Home;
