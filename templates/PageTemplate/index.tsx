import JsonLd from '@/components/JsonLd';
import Sections from '@/components/Sections';
import type { IPageDocument } from '@/tools/sanity/schema/documents/page';

interface WebPageProps extends ResolvedPageProps {
  data: IPageDocument;
}

const PageTemplate = async (props: WebPageProps) => {
  const { data, params } = props;
  return (
    <>
      <Sections sections={data?.sections} params={params} />
      <JsonLd.Page document={data} />
    </>
  );
};

export default PageTemplate;
