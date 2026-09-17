import type { ResolvingMetadata, Metadata } from 'next';

import defaultOgImage from '@/assets/images/open-graph.png';
import metadata from '@/config/metadata';

interface CustomMetadata {
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  openGraphUrl?: string;
  openGraphImage?: string;
  alternates?: {
    canonical?: string;
  };
  robots?: Metadata['robots'];
}

interface GenerateSanityMetadata extends CustomMetadata {
  query?: (params: SanityPageParams | undefined) => Promise<CustomMetadata>;
}

const generateSanityMetadata = (params: GenerateSanityMetadata) => {
  const { query, seoTitle, seoDescription, seoKeywords, openGraphUrl, openGraphImage, alternates, robots } = params;

  if (
    !query &&
    (seoTitle === null ||
      seoTitle === undefined ||
      seoDescription === null ||
      seoDescription === undefined ||
      alternates?.canonical === null ||
      alternates?.canonical === undefined)
  ) {
    throw new Error('Missing required parameters for generateSanityMetadata');
  }

  const shouldIndex = process.env.NEXT_PUBLIC_IS_STAGING !== 'true';

  const defaultRobots = {
    follow: shouldIndex,
    googleBot: {
      follow: shouldIndex,
      index: shouldIndex,
      'max-image-preview': 'large' as const,
      'max-snippet': -1,
      'max-video-preview': -1
    },
    index: shouldIndex,
    nocache: !shouldIndex
  };

  let seoData: CustomMetadata = {
    alternates: alternates || {},
    openGraphImage,
    openGraphUrl,
    robots: robots,
    seoDescription,
    seoKeywords,
    seoTitle
  };

  // Generate Metadata for Next.JS
  // https://nextjs.org/docs/app/api-reference/functions/generate-metadata
  // Dynamic metadata depends on dynamic information, such as the current route parameters,
  // external data, or metadata in parent segments,
  // can be set by exporting a generateMetadata function that returns a Metadata object.
  const generateMetadata = async (props: SanityPageProps, parent: ResolvingMetadata): Promise<Metadata> => {
    try {
      const params = await props.params;

      // Fetch Sanity document

      if (query) {
        seoData = await query(params);
      }

      return {
        ...metadata,
        alternates: alternates || seoData?.alternates || {},
        description: seoDescription || seoData?.seoDescription || metadata.description,
        keywords: seoKeywords || seoData?.seoKeywords || [],
        openGraph: {
          ...metadata.openGraph,
          description: seoDescription || seoData?.seoDescription || metadata.description || '',
          images: [
            {
              height: defaultOgImage.height,
              url: seoData?.openGraphImage || defaultOgImage.src,
              width: defaultOgImage.width
            }
          ],
          title: seoTitle || seoData?.seoTitle || metadata.title || '',
          url: seoData?.openGraphUrl || metadata.openGraph?.url
        },
        robots: robots || seoData?.robots || defaultRobots,
        title: seoTitle || seoData?.seoTitle || metadata.title
      };
    } catch (error) {
      console.log('An error occured while generating metadata', error);
      return {};
    }
  };

  return generateMetadata;
};

export default generateSanityMetadata;
