import type { FC } from 'react';

import Link from '@/components/Link';
import Section from '@/components/Section';
import Text from '@/components/Text';
import TextBlock from '@/components/TextBlock';
import { getSectionSpacingProps, getSectionTheme } from '@/tools/helpers/section';
import type { IClosingCtaSection } from '@/tools/sanity/schema/sections/closingCtaSection';

import styles from './styles.module.scss';

const ClosingCtaSection: FC<IClosingCtaSection> = (props) => {
  const { title, content, addButton, button } = props;

  return (
    <Section name="ClosingCtaSection" theme={getSectionTheme(props, 'dark')} {...getSectionSpacingProps(props)}>
      <div className={styles.contentContainer}>
        <div className={styles.textContainer}>
          <Text className={styles.title} as="h5" text={title} alignment="center" variant="heading" size="lg" />
          <TextBlock className={styles.content} blocks={content} alignment="center" />
        </div>
        {addButton && (
          <Link {...button?.link} className={styles.button} variant="square" size="md" theme="secondary">
            <Text text={button?.label} weight="medium" />
          </Link>
        )}
      </div>
    </Section>
  );
};

export default ClosingCtaSection;
