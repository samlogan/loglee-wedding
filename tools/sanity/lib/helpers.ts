'use server';

import type { SanityDocument } from 'next-sanity';

import { sanityFetch } from './fetch';

// export const fetchDeals = (props: {
//   categoryId?: string;
//   brandId?: string;
//   selectedIds?: string[];
// }) => {
//   let query = `*[_type == "deal"`;
//   if (props.categoryId) query += ` && category._ref == "${props.categoryId}"`;
//   if (props.brandId) query += ` && brand._ref == "${props.brandId}"`;
//   if (props.selectedIds && props.selectedIds.length) {
//     query += ` && _id in [${props.selectedIds.map(id => `"${id}"`).join(', ')}]`;
//   }
//   query += `]{ ${fragments.deal} }`;
//   return sanityFetch<SanityDeal[]>({
//     query: query
//   });
// };

export const getDocumentPathnames = async () => {
  const docs: SanityDocument[] = await sanityFetch<SanityDocument[]>({
    query: `*[_type in ["page", "blogPost"] && defined(pathname)]{ pathname }`
  });
  return docs.map((doc) => doc.pathname);
};
