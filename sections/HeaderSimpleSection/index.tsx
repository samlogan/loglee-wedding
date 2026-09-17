import type { FC } from 'react';

import Section from '@/components/Section';
import Text from '@/components/Text';
import TextBlock from '@/components/TextBlock';
import TextTitle from '@/components/TextTitle';
import { getSectionSpacingProps, getSectionTheme } from '@/tools/helpers/section';
import type { IHeaderSimpleSection } from '@/tools/sanity/schema/sections/headerSimpleSection';

import styles from './styles.module.scss';

const HeaderSimpleSection: FC<IHeaderSimpleSection> = (props) => {
  const { tagline, title, content } = props;

  return (
    <Section name="HeaderSimpleSection" theme={getSectionTheme(props, 'dark')} {...getSectionSpacingProps(props)}>
      <div className={styles.contentContainer}>
        {tagline && (
          <Text as="p" text={tagline} size="sm" textTransform="uppercase" color="themeFgAccent" weight="medium" />
        )}
        {title && <TextTitle title={title} as="h1" variant="heading" size="xl" />}
        {content && <TextBlock className={styles.content} blocks={content} />}
      </div>
    </Section>
  );
};

export default HeaderSimpleSection;
