import type { BlogPosting, WithContext } from 'schema-dts';

interface BlogPostingProps {
  documentTitle: string | undefined;
  documentDescription: string | undefined;
  documentImage: string | undefined;
  documentDatePublished: string | undefined;
  documentDateModified: string | undefined;
  documentUrl: string;
  siteUrl: string | undefined;
  authorId?: string;
  wordCount?: number;
  articleSection?: string[];
}

const blogPosting = (props: BlogPostingProps): WithContext<BlogPosting> => {
  const {
    documentDateModified,
    documentDatePublished,
    documentImage,
    documentTitle,
    documentDescription,
    documentUrl,
    siteUrl,
    authorId,
    wordCount,
    articleSection
  } = props;

  const orgRef = { '@id': `${siteUrl}/#organization` } as const;
  const authorRef = authorId ? { '@id': `${siteUrl}/#person/${authorId}` } : orgRef;

  return {
    '@context': 'https://schema.org',
    '@id': `${documentUrl}#article`,
    '@type': 'BlogPosting',
    author: authorRef,
    dateModified: documentDateModified,
    datePublished: documentDatePublished,
    description: documentDescription,
    headline: documentTitle,
    image: {
      '@type': 'ImageObject',
      url: documentImage
    },
    mainEntityOfPage: {
      '@id': `${documentUrl}#webpage`
    },
    publisher: orgRef,
    ...(wordCount ? { wordCount } : {}),
    ...(articleSection && articleSection.length > 0 ? { articleSection } : {})
  };
};

export default blogPosting;
