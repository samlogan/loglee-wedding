import metadata from '@/config/metadata';
import BlogLandingTemplate from '@/templates/BlogLandingTemplate';
import { generateSanityMetadata } from '@/tools/sanity/helpers';
import { sanityFetch } from '@/tools/sanity/lib/fetch';
import { BLOG_LANDING_QUERY, POSTS_QUERY } from '@/tools/sanity/lib/queries.groq';
import type { IBlogLandingPageDocument } from '@/tools/sanity/schema/documents/blogLandingPage';
import type { IBlogPostDocument } from '@/tools/sanity/schema/documents/blogPost';

const POSTS_PER_PAGE = 21;

export interface IBlogPosts {
  posts: IBlogPostDocument[];
  totalPosts: number;
}

const BlogLandingDocument = async (props: SanityPageProps) => {
  const params = await props.params;

  const blogLanding = await sanityFetch<IBlogLandingPageDocument>({
    query: BLOG_LANDING_QUERY,
    tags: ['blog']
  });

  const blogs = await sanityFetch<IBlogPosts>({
    params: { end: POSTS_PER_PAGE, start: 0 },
    query: POSTS_QUERY,
    tags: ['blog']
  });

  return <BlogLandingTemplate params={params} data={blogLanding} blogs={blogs?.posts} />;
};

export const generateMetadata = generateSanityMetadata({
  query: async (params) => {
    const blogLanding = await sanityFetch<IBlogLandingPageDocument>({
      query: BLOG_LANDING_QUERY,
      tags: ['blog']
    });

    const canonicalPath = 'blog';
    const canonicalUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/${canonicalPath}/`;

    return {
      alternates: {
        canonical: canonicalUrl
      },
      openGraphImage: blogLanding?.seoData?.openGraphImage?.asset?.url,
      openGraphUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/${canonicalPath}/`,
      robots: blogLanding?.seoData?.noIndex ? { googleBot: { index: false }, index: false } : undefined,
      seoDescription: blogLanding?.seoData?.seoDescription,
      seoTitle: blogLanding?.seoData?.seoTitle || `${blogLanding?.title || 'Blog'} | ${metadata.title}`
    };
  }
});

export const dynamic = 'force-static';

export default BlogLandingDocument;
