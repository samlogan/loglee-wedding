import type { FC } from 'react';

import Image from '@/components/Image';
import Link from '@/components/Link';
import Section from '@/components/Section';
import Text from '@/components/Text';
import TextBlock from '@/components/TextBlock';
import TextTitle from '@/components/TextTitle';
import { getSectionSpacingProps, getSectionTheme } from '@/tools/helpers/section';
import type { IGridSection } from '@/tools/sanity/schema/sections/gridSection';

import styles from './styles.module.scss';

const GridSection: FC<IGridSection> = (props) => {
  const { tagline, title, content, cards } = props;

  return (
    <Section name="GridSection" theme={getSectionTheme(props, 'dark')} {...getSectionSpacingProps(props)}>
      <div className={styles.contentContainer}>
        <div className={styles.textContainer}>
          {tagline && (
            <Text
              as="p"
              text={tagline}
              size="sm"
              textTransform="uppercase"
              color="themeFgAccent"
              weight="medium"
              alignment="center"
            />
          )}
          {title && <TextTitle title={title} variant="heading" size="lg" alignment="center" />}
          {content && <TextBlock className={styles.content} blocks={content} alignment="center" />}
        </div>

        <div className={styles.gridContainer}>
          {cards?.map((card, index) => (
            <div key={index} className={styles.card}>
              <div className={styles.imageContainer}>
                <Image {...card.image} aspectRatio="1-1" />
              </div>

              <div className={styles.cardContent}>
                <Text as="p" text={card.title} variant="body" size="lg" />
                <TextBlock blocks={card.content} />
                {card?.addButton && (
                  <Link {...card?.button?.link} className={styles.button} variant="square" size="md" theme="primary">
                    <Text text={card?.button?.label} weight="medium" />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
};

export default GridSection;
