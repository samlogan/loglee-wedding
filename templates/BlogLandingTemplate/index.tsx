import JsonLd from '@/components/JsonLd';
import Section from '@/components/Section';
import Text from '@/components/Text';
import type { IBlogLandingPageDocument } from '@/tools/sanity/schema/documents/blogLandingPage';
import type { IBlogPostDocument } from '@/tools/sanity/schema/documents/blogPost';

interface WebPageProps extends ResolvedPageProps {
  data: IBlogLandingPageDocument;
  blogs: IBlogPostDocument[];
}

const BlogLandingTemplate = async (props: WebPageProps) => {
  const { data, blogs, params } = props;
  return (
    <>
      <Section>
        <Text as="h1" text="Blog Landing Template" variant="heading" size="md" />
      </Section>
      <JsonLd.Page document={data} />
    </>
  );
};

export default BlogLandingTemplate;
