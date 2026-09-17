import type { MetadataRoute } from 'next';

const IS_PROD = process.env.NODE_ENV === 'production';
const ENABLE_INDEXING = process.env.NEXT_PUBLIC_IS_STAGING !== 'true';

/**
 * Generates robots metadata for SEO purposes based on the current environment.
 * In production, it allows web crawlers to access the root path ("/") but disallows
 * access to specific paths such as maintenance pages, thank-you pages, etc.
 * In non-production environments, it disallows access to all paths.
 * Refer to: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots
 */
const robots = (): MetadataRoute.Robots => {
  if (IS_PROD && ENABLE_INDEXING) {
    return {
      rules: {
        allow: '/',
        disallow: [
          '/studio/',
          '/maintenance/',
          '/thank-you/',
          '/preview/',
          '/dev/*',
          '/404/',
          '/404.html',
          '/template/*'
        ],
        userAgent: '*'
      },
      sitemap: `${process.env.NEXT_PUBLIC_SITE_URL}/sitemap.xml`
    };
  }

  return {
    rules: {
      disallow: '/',
      userAgent: '*'
    }
  };
};

export default robots;
