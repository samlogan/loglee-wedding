'use client';

import Accordion from '@/components/Accordion';
import TextBlock from '@/components/TextBlock';
import type { IFaqSection } from '@/tools/sanity/schema/sections/faqSection';

import styles from './styles.module.scss';

const FaqItems = ({ faqItems }: { faqItems: IFaqSection['faqItems'] }) => (
  <div className={styles.accordionContainer}>
    <Accordion>
      {faqItems?.map((item, index) => (
        <Accordion.Item
          key={index}
          title={item.question}
          className={styles.faqItem}
          classNameTrigger={styles.faqItemTrigger}
        >
          <div className={styles.faqItemContent}>
            <TextBlock blocks={item.answer} />
          </div>
        </Accordion.Item>
      ))}
    </Accordion>
  </div>
);

export default FaqItems;
