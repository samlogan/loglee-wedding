import Section from '@/components/Section';
import Text from '@/components/Text';
import metadata from '@/config/metadata';
import getSitemap from '@/tools/helpers/getSitemap';
import { generateSanityMetadata } from '@/tools/sanity/helpers';

import styles from './styles.module.scss';

function camelCaseToWords(s: string) {
  const result = s.replaceAll(/([A-Z])/g, ' $1');
  return result.charAt(0).toUpperCase() + result.slice(1);
}

const HTMLSitemap = async () => {
  const { grouped } = await getSitemap();
  return (
    <>
      <Section>
        <Text as="h1" text="HTML Sitemap" variant="heading" size="sm" />
      </Section>
      <Section removeTopSpacing>
        {Object.entries(grouped).map(([type, items]) => (
          <div key={type} className={styles.group}>
            <Text as="h2" text={camelCaseToWords(type)} size="xs" variant="heading" className={styles.groupTitle} />
            <ul className={styles.groupList}>
              {items.map((item, index) => (
                <li key={index}>
                  <a href={item.url}>
                    <Text as="span" text={item.url} size="sm" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Section>
    </>
  );
};

export const generateMetadata = generateSanityMetadata({
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL}/sitemap/html/`
  },
  seoDescription: '',
  seoTitle: `HTML Sitemap | ${metadata.title}`
});

export const dynamic = 'force-static';

export default HTMLSitemap;
