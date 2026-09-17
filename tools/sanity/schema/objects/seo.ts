import { defineType } from 'sanity';

interface ISeoObject {
  seoTitle?: string;
  seoDescription?: string;
  openGraphImage?: {
    asset: {
      url: string;
    };
  };
  canonicalUrl?: string;
  noIndex: boolean;
}

const seo = defineType({
  fields: [
    {
      description: 'This will change your page meta title in browsers. Ideal length is 50-60 characters.',
      name: `seoTitle`,
      title: `SEO Title`,
      type: `string`,
      validation: (Rule) => Rule.max(60).warning('Shorter titles are usually better for SEO.')
    },
    {
      description: 'This will change your page description in browsers. Ideal length is 50-160 characters.',
      name: `seoDescription`,
      title: `SEO Description`,
      type: `string`,
      validation: (Rule) => Rule.max(160).warning('Shorter descriptions are usually better for SEO.')
    },
    {
      description:
        'The thumbnail displayed on social networks (such as Facebook & LinkedIn) to preview your webpage whenever someone shares this page link. Recommended 1200 x 630px.',
      name: `openGraphImage`,
      title: `Open Graph Image`,
      type: `image`
    },
    {
      description: `The canonical URL for this page. If left blank, the page's URL will be used.`,
      name: `canonicalUrl`,
      title: `Canonical URL`,
      type: `url`
    },
    {
      initialValue: false,
      name: `noIndex`,
      title: `No-Index (Block search engine indexing)`,
      type: `boolean`
    }
  ],
  name: 'seo',
  title: 'Seo',
  type: 'object'
});

export default seo;
export type { ISeoObject };
