import type { FC } from 'react';

import Link from '@/components/Link';
import Section from '@/components/Section';
import TextBlock from '@/components/TextBlock';
import TextTitle from '@/components/TextTitle';
import { getSectionSpacingProps, getSectionTheme } from '@/tools/helpers/section';
import type { IFaqSection } from '@/tools/sanity/schema/sections/faqSection';

import FaqItems from './FaqItems';

import styles from './styles.module.scss';

const FaqSection: FC<IFaqSection> = (props) => {
  const { title, content, addButton, button, faqItems } = props;

  return (
    <Section name="FaqSection" theme={getSectionTheme(props)} {...getSectionSpacingProps(props)}>
      <div className={styles.contentContainer}>
        {(title || content || addButton) && (
          <div className={styles.infoContainer}>
            {title && <TextTitle title={title} variant="heading" size="lg" />}
            {content && <TextBlock blocks={content} />}
            {addButton && button && (
              <Link {...button?.link} variant="rounded" theme="primary" size="md">
                {button?.label}
              </Link>
            )}
          </div>
        )}
        {faqItems && faqItems?.length > 0 && <FaqItems faqItems={faqItems} />}
      </div>
    </Section>
  );
};

export default FaqSection;
