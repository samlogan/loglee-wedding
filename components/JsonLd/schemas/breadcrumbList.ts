import type { BreadcrumbList, ListItem, WithContext } from 'schema-dts';

interface BreadcrumbListProps {
  pageUrl: string;
  itemListElement: ListItem[];
}

const breadcrumbList = (props: BreadcrumbListProps): WithContext<BreadcrumbList> => {
  const { pageUrl, itemListElement } = props;
  return {
    '@context': 'https://schema.org',
    '@id': `${pageUrl}#breadcrumb`,
    '@type': 'BreadcrumbList',
    itemListElement
  };
};

export default breadcrumbList;
