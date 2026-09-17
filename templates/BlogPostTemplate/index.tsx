import JsonLd from '@/components/JsonLd';
import Section from '@/components/Section';
import Sections from '@/components/Sections';
import SocialsShare from '@/components/SocialsShare';
import Text from '@/components/Text';
import type { IBlogPostDocument } from '@/tools/sanity/schema/documents/blogPost';

interface WebPageProps extends ResolvedPageProps {
  data: IBlogPostDocument;
}

const BlogPostTemplate = async (props: WebPageProps) => {
  const { data, params } = props;
  const { title } = data;
  return (
    <>
      <Section>
        <Text as="h1" text={title} variant="heading" size="md" />
        <SocialsShare />
      </Section>
      <Sections sections={data?.sections} params={params} />
      <JsonLd.Article document={data} />
    </>
  );
};

export default BlogPostTemplate;
