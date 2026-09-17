import type { FC } from 'react';

import Image from '@/components/Image';
import Link from '@/components/Link';
import Section from '@/components/Section';
import Text from '@/components/Text';
import TextBlock from '@/components/TextBlock';
import TextTitle from '@/components/TextTitle';
import { getSectionSpacingProps, getSectionTheme } from '@/tools/helpers/section';
import type { IHeaderHeroSection } from '@/tools/sanity/schema/sections/headerHeroSection';

import styles from './styles.module.scss';

const HeaderHeroSection: FC<IHeaderHeroSection> = (props) => {
  const { tagline, title, content, addButton, button, image } = props;

  return (
    <Section
      name="HeaderHeroSection"
      full
      className={styles.section}
      theme={getSectionTheme(props, 'dark')}
      {...getSectionSpacingProps(props)}
    >
      <div className={styles.contentContainer}>
        <div className={styles.infoContainer}>
          <div className={styles.textAndButtonContainer}>
            {tagline && (
              <Text as="p" text={tagline} size="sm" textTransform="uppercase" color="themeFgAccent" weight="medium" />
            )}
            {title && <TextTitle title={title} as="h1" variant="heading" size="xl" />}
            {content && <TextBlock className={styles.content} blocks={content} />}
            {addButton && (
              <Link {...button?.link} className={styles.button} variant="square" size="md" theme="secondary">
                <Text text={button?.label} weight="medium" />
              </Link>
            )}
          </div>
        </div>
        <div className={styles.background}>
          <Image {...image} className={styles.bgImage} />
        </div>
      </div>
    </Section>
  );
};

export default HeaderHeroSection;
