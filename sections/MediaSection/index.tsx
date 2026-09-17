import type { FC } from 'react';

import Image from '@/components/Image';
import Section from '@/components/Section';
import { getSectionSpacingProps, getSectionTheme } from '@/tools/helpers/section';
import stringClean from '@/tools/helpers/stringClean';
import type { IMediaSection } from '@/tools/sanity/schema/sections/mediaSection';

import styles from './styles.module.scss';

const MediaSection: FC<IMediaSection> = (props) => {
  const { mediaType: rawMediaType, image } = props;
  const mediaType = stringClean(rawMediaType);

  return (
    <Section
      name="MediaSection"
      theme={getSectionTheme(props)}
      {...getSectionSpacingProps(props)}
      className={styles.section}
      containerClassName={styles.container}
    >
      {mediaType === 'image' && image?.asset?.url && <Image {...image} aspectRatio="16-9" />}
    </Section>
  );
};

export default MediaSection;
