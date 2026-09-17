import type { FC } from 'react';

import Image from '@/components/Image';
import Link from '@/components/Link';
import Section from '@/components/Section';
import Text from '@/components/Text';
import TextBlock from '@/components/TextBlock';
import TextTitle from '@/components/TextTitle';
import classNames from '@/tools/helpers/classNames';
import { getSectionSpacingProps, getSectionTheme } from '@/tools/helpers/section';
import stringClean from '@/tools/helpers/stringClean';
import type { ITwoColumnDefaultSection } from '@/tools/sanity/schema/sections/twoColDefaultSection';

import styles from './styles.module.scss';

const TwoColumnDefaultSection: FC<ITwoColumnDefaultSection> = (props) => {
  const { title, content, image, addButton, button, alignMedia: rawAlignMedia } = props;
  const alignMedia = stringClean(rawAlignMedia);

  return (
    <Section
      name="TwoColumnDefaultSection"
      theme={getSectionTheme(props)}
      containerClassName={classNames(styles.container, styles[alignMedia])}
      {...getSectionSpacingProps(props)}
    >
      <div className={styles.imageContainer}>
        <Image {...image} aspectRatio="1-1" className={styles.image} />
      </div>
      <div className={styles.contentContainer}>
        {title && (
          <div className={styles.titleContainer}>
            <TextTitle title={title} variant="heading" size="lg" />
          </div>
        )}
        {content && (
          <div className={styles.content}>
            <TextBlock blocks={content} />
          </div>
        )}
        {addButton && (
          <Link {...button?.link} className={styles.button} variant="square" size="md" theme="primary">
            <Text text={button?.label} weight="medium" />
          </Link>
        )}
      </div>
    </Section>
  );
};

export default TwoColumnDefaultSection;
