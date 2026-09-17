import type { FC } from 'react';

import Image from '@/components/Image';
import Section from '@/components/Section';
import TextTitle from '@/components/TextTitle';
import { getSectionSpacingProps, getSectionTheme } from '@/tools/helpers/section';
import type { ILogosSection } from '@/tools/sanity/schema/sections/logosSection';

import styles from './styles.module.scss';

const LogosSection: FC<ILogosSection> = (props) => {
  const { title, images } = props;
  return (
    <Section name="LogosSection" theme={getSectionTheme(props)} {...getSectionSpacingProps(props)}>
      {title && <TextTitle className={styles.title} title={title} variant="body" size="md" color="themeFgDefault" />}
      <div className={styles.logos}>
        {images?.map((image, i) => (
          <Image key={i} {...image} className={styles.logo} objectFit="contain" placeholder="empty" />
        ))}
      </div>
    </Section>
  );
};

export default LogosSection;
