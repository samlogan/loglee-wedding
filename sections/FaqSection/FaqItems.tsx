'use client';

import Accordion from '@/components/Accordion';
import Tag from '@/components/Tag';
import Text from '@/components/Text';
import TextBlock from '@/components/TextBlock';
import classNames from '@/helpers/classNames';
import formatOrdinal from '@/helpers/formatOrdinal';
import type { IFaqSection } from '@/tools/sanity/schema/sections/faqSection';

import styles from './styles.module.scss';

/**
 * The accordion column, numbered.
 *
 * ## The ordinal and the question are the trigger's *content*, not a wrapper around it
 *
 * `Accordion.Item` takes `title` as a `ReactNode`, and the node it is given here is a fragment of
 * two runs rather than a string. That matters for more than layout: `components/Accordion` owns the
 * single-open state and the `<button>` that carries `aria-expanded` / `aria-controls`, and nothing
 * below reaches into either. The design draws the ordinal *inside* the pressable row (node 16:653 is
 * the Button frame and 16:654 the ordinal inside it), and passing it as trigger content is the way
 * to get that without restructuring the control.
 *
 * The consequence is that the ordinal is part of the button's accessible name unless something stops
 * it — hence `ariaHidden` below, which is also why `formatOrdinal` exists as an element rather than a
 * CSS counter. See that helper's docblock.
 */
export interface FaqItemsProps {
  faqItems: IFaqSection['faqItems'];
  className?: string;
}

const FaqItems = ({ faqItems, className }: FaqItemsProps) => (
  <div className={classNames(styles.accordionContainer, className)}>
    <Accordion>
      {faqItems?.map((item, index) => (
        <Accordion.Item
          /*
           * The Sanity array key, falling back to the position only for mock data that has none.
           * `components/Accordion` tracks the open item by index, so a position key makes a reorder
           * in the Studio leave the wrong panel open — see the note in `queries.groq.ts`.
           */
          key={item._key ?? index}
          title={
            <>
              {/*
               * `formatOrdinal(index)` takes the **zero-based** map index and returns the one-based,
               * zero-padded string. Passing `index + 1` is the documented trap — it silently starts
               * the list at 02.
               *
               * `ariaHidden` because the number is decoration: it is derived from position, it is
               * not part of the question, and leaving it in the tree makes the trigger announce
               * "01 How do we get there?". `TwoColumnListSection` hides its ordinals for the same
               * reason, with the extra argument that an `<ol>` already announces the position.
               */}
              <Text
                ariaHidden
                as="span"
                className={styles.ordinal}
                color="themeFgAccent"
                size="xs"
                text={formatOrdinal(index)}
                variant="mono"
                weight="medium"
              />
              {/*
               * A `<span>` and not a heading — the heading is the `headingLevel={3}` wrapper above.
               *
               * The two are not alternatives. A heading *here* would sit inside the `<button>`,
               * where the HTML-AAM mapping flattens a button's content to a text alternative and the
               * heading role is discarded: an outline entry no assistive technology reports. The
               * APG's accordion pattern puts the heading around the trigger instead, which is what
               * `headingLevel` renders, and which is the only form that gives a screen-reader user
               * heading navigation through a long FAQ.
               */}
              <Text
                as="span"
                className={styles.question}
                size="xs"
                text={item.question}
                variant="heading"
                weight="semibold"
              />
            </>
          }
          classNameTrigger={styles.faqItemTrigger}
          /*
           * `<h3><button>` — the level below this section's own `<h2>`. See the note on the question
           * `<span>` below for why the heading goes *around* the trigger and not inside it.
           */
          headingLevel={3}
        >
          <div className={styles.faqItemContent}>
            <TextBlock blocks={item.answer} config={{ p: { className: styles.answerText, size: 'lg' } }} />
            {/*
             * The outline chip beneath an answer (nodes 16:667, 16:750). `outline` rather than
             * `filled`: it sits on the page rather than over media, which is the distinction
             * `components/Tag` draws between its two variants.
             *
             * `uppercase` with sentence case in the CMS — `text-transform` does not keep capitals
             * out of the accessible name, so the stored string is what a screen reader spells out.
             */}
            {Boolean(item.note?.trim()) && (
              <Tag className={styles.note} label={item.note} size="lg" uppercase variant="outline" weight="regular" />
            )}
          </div>
        </Accordion.Item>
      ))}
    </Accordion>
  </div>
);

export default FaqItems;
