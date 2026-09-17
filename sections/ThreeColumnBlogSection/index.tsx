import type { FC } from 'react';

import Image from '@/components/Image';
import Link from '@/components/Link';
import Section from '@/components/Section';
import Text from '@/components/Text';
import TextBlock from '@/components/TextBlock';
import TextTitle from '@/components/TextTitle';
import { getSectionSpacingProps, getSectionTheme } from '@/tools/helpers/section';
import type { IThreeColBlogSection } from '@/tools/sanity/schema/sections/threeColBlogSection';

import styles from './styles.module.scss';

const ThreeColBlogSection: FC<IThreeColBlogSection> = (props) => {
  const { title, content, addButton, button, featureCards } = props;

  return (
    <Section name="ThreeColBlogSection" theme={getSectionTheme(props, 'light')} {...getSectionSpacingProps(props)}>
      <div className={styles.contentContainer}>
        <div className={styles.header}>
          <div className={styles.headerText}>
            {/* `title` is a plain string on this section, unlike ThreeColSection's rich title. */}
            {title && <Text as="h2" text={title} variant="heading" size="lg" />}
            {content && <TextBlock className={styles.content} blocks={content} />}
          </div>
          {addButton && button && (
            <Link {...button.link} className={styles.headerButton} variant="square" size="md" theme="primary">
              <Text text={button.label} weight="medium" />
            </Link>
          )}
        </div>

        {featureCards?.length ? (
          <div className={styles.gridContainer}>
            {featureCards.map((card, index) => (
              <article className={styles.card} key={card._key ?? `${card.title}-${index}`}>
                {card.image && (
                  <div className={styles.imageContainer}>
                    {/* 16-9 rather than square: these are article cards, so the image is a lead image. */}
                    <Image {...card.image} aspectRatio="16-9" />
                  </div>
                )}
                <div className={styles.cardContent}>
                  {card.title && <TextTitle title={card.title} variant="body" size="lg" />}
                  {card.content && <TextBlock blocks={card.content} />}
                  {card.addButton && card.button && (
                    <Link {...card.button.link} className={styles.cardButton} variant="content" size="md">
                      <Text text={card.button.label} weight="medium" />
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </Section>
  );
};

export default ThreeColBlogSection;
