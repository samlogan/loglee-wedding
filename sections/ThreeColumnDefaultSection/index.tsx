import type { FC } from 'react';

import Image from '@/components/Image';
import Link from '@/components/Link';
import Section from '@/components/Section';
import Text from '@/components/Text';
import TextBlock from '@/components/TextBlock';
import TextTitle from '@/components/TextTitle';
import { getSectionSpacingProps, getSectionTheme } from '@/tools/helpers/section';
import type { IThreeColSection } from '@/tools/sanity/schema/sections/threeColSection';

import styles from './styles.module.scss';

const ThreeColSection: FC<IThreeColSection> = (props) => {
  const { tagline, title, content, featureCards } = props;

  return (
    <Section name="ThreeColSection" theme={getSectionTheme(props, 'light')} {...getSectionSpacingProps(props)}>
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
          {/*
           * TextTitle rather than Text — the `title` field is the rich `title` element type, so its
           * value carries markup. Passing it to Text would print the tags.
           */}
          {title && <TextTitle title={title} variant="heading" size="lg" alignment="center" />}
          {content && <TextBlock className={styles.content} blocks={content} alignment="center" />}
        </div>

        {/*
         * Rendered only when there is something to render. GROQ projects an empty array as `null`,
         * and a destructuring default only covers `undefined`, so `featureCards?.length` is the check
         * that holds for both — an empty grid would otherwise leave a gap the spacing tokens paid for.
         */}
        {featureCards?.length ? (
          <div className={styles.gridContainer}>
            {featureCards.map((card, index) => (
              <div className={styles.card} key={card._key ?? `${card.title}-${index}`}>
                {card.image && (
                  <div className={styles.imageContainer}>
                    <Image {...card.image} aspectRatio="1-1" />
                  </div>
                )}
                <div className={styles.cardContent}>
                  {card.title && <TextTitle title={card.title} variant="body" size="lg" />}
                  {card.content && <TextBlock blocks={card.content} />}
                  {card.addButton && card.button && (
                    <Link {...card.button.link} className={styles.button} variant="square" size="md" theme="primary">
                      <Text text={card.button.label} weight="medium" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </Section>
  );
};

export default ThreeColSection;
