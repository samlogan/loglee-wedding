import type { SanityDocument } from 'next-sanity';
import { notFound } from 'next/navigation';

import metadata from '@/config/metadata';
import BlogPostTemplate from '@/templates/BlogPostTemplate';
import { generateSanityMetadata } from '@/tools/sanity/helpers';
import { client } from '@/tools/sanity/lib/client';
import { sanityFetch } from '@/tools/sanity/lib/fetch';
import { POST_QUERY } from '@/tools/sanity/lib/queries.groq';
import type { IBlogPostDocument } from '@/tools/sanity/schema/documents/blogPost';

const BlogDocument = async (props: SanityPageProps) => {
  const params = await props.params;
  const pathname = `/blog/${params?.slug}/`;

  const blogPost = await sanityFetch<IBlogPostDocument>({
    params: { pathname },
    query: POST_QUERY,
    tags: ['blog']
  });

  if (!blogPost) {
    return notFound();
  }

  return <BlogPostTemplate data={blogPost} params={params} />;
};

export const generateMetadata = generateSanityMetadata({
  query: async (params) => {
    const pathname = `/blog/${params?.slug}/`;

    const blogPost = await sanityFetch<IBlogPostDocument>({
      params: { pathname },
      query: POST_QUERY,
      tags: ['blog']
    });

    const canonicalPath = `${process.env.NEXT_PUBLIC_SITE_URL}${pathname}`;

    return {
      alternates: {
        canonical: canonicalPath
      },
      openGraphImage: blogPost?.seoData?.openGraphImage?.asset?.url,
      openGraphUrl: canonicalPath,
      robots: blogPost?.seoData?.noIndex ? { googleBot: { index: false }, index: false } : undefined,
      seoDescription: blogPost?.seoData?.seoDescription,
      seoTitle: blogPost?.seoData?.seoTitle || `${blogPost?.title} | ${metadata.title}`
    };
  }
});

export const generateStaticParams = async () => {
  const blogSlugs: SanityDocument[] = await client.fetch(`*[_type == "blogPost"]{ "slug": slug.current }`);

  const params = blogSlugs.map((doc) => ({
    slug: doc.slug.replaceAll('/', '') as string
  }));

  return params;
};

export const dynamic = 'force-static';

export default BlogDocument;
