'use client';

import { useId } from 'react';
import type { ReactNode } from 'react';

import classNames from '@/helpers/classNames';
import useElementHeight from '@/tools/hooks/useElementHeight';

import Text from '../../Text';

import styles from './styles.module.scss';

interface AccordionItemProps {
  title: ReactNode | string;
  content?: string;
  children?: ReactNode;
  active?: boolean;
  setActive?: () => void;
  className?: string;
  classNameTrigger?: string;
  /**
   * Positioning and sizing for the `+` / `−` chip only — the fill, the stroke and the inversion stay
   * this component's. `sections/FaqSection` uses it to re-point the chip's size pair.
   */
  classNameIndicator?: string;
  /**
   * An explicit accessible name for the trigger, for the case where `title` is a node carrying no
   * text of its own (an icon, an image). Omit it and the button is named by its own content, which
   * is what a disclosure should be — see the note on the `<button>` below.
   */
  ariaLabel?: string;
}

const AccordionItem = (props: AccordionItemProps) => {
  const { title, content, children, active, setActive, className, classNameTrigger, classNameIndicator, ariaLabel } =
    props;

  const classes = classNames(styles.item, { [styles.active]: active }, className);
  const id = useId();
  const contentId = `accordion-content-${id}`;

  const [ref, height] = useElementHeight({ disabled: !active });

  return (
    <div className={classes}>
      {/*
       * ## The accessible name is the question, not the verb
       *
       * This used to carry `aria-label={active ? 'Close accordion item' : 'Open accordion item'}`,
       * which is not a label for *this* control — it is a label for every control of this kind. An
       * `aria-label` overrides the element's content outright, so a six-item FAQ published six
       * buttons all named "Open accordion item": WCAG 2.4.6 (Headings and Labels) and 4.1.2 (Name,
       * Role, Value) both, and unusable in a screen reader's element list — which is precisely where
       * a long FAQ gets navigated from.
       *
       * The expanded/collapsed state does not belong in the name either. `aria-expanded` already
       * carries it and is announced automatically, so spelling it into the label says it twice —
       * and, computed from the same boolean, it could only ever agree with itself.
       *
       * Removing it leaves the name computed from the button's own content, which is the disclosure
       * pattern as written. `ariaLabel` stays available for a trigger whose content is not text.
       */}
      <button
        className={classNames(styles.title, classNameTrigger)}
        data-name="FAQTitle"
        onClick={setActive}
        aria-label={ariaLabel}
        aria-expanded={active}
        aria-controls={contentId}
      >
        {typeof title === 'string' ? <Text text={title} size="lg" weight="regular" color="themeFgDefault" /> : title}
        {/*
         * A plus that becomes a minus inside a chip that inverts, replacing an `Icon` that rotated
         * the plus 45° into a cross. A cross reads as "dismiss"; the design (nodes 16:658 open,
         * 16:675 closed) draws the two glyphs of a disclosure.
         *
         * `Text` in its `mono` variant rather than a bare `<span>` — the glyph is JetBrains Mono
         * Medium in the comp, and MAM-1927 made that a type role rather than an `@include
         * mono-font()`. `size` is omitted on purpose: the three mono rungs top out at 14px and this
         * is drawn at 20px, so the module keeps its own `font-size`, which is the documented way to
         * opt out of the rung list.
         *
         * Not `components/Tag`, deliberately. `Tag` is presentational *and*
         * non-interactive by construction — no handler, no `href`, no `tabindex`, no role, asserted
         * by its own `NotInteractive` story — and this chip sits inside the trigger's hit area. Same
         * shape, different object.
         *
         * `aria-hidden`, for the reason the label note above gives: `aria-expanded` already
         * announces the state, and without this the button's computed name would gain a trailing
         * "+" or "−". The glyph is U+2212 MINUS SIGN rather than a hyphen — it is drawn at the
         * plus's own width, so the chip does not reflow between states.
         */}
        {(!!children || !!content) && (
          <Text
            ariaHidden
            as="span"
            className={classNames(styles.indicator, classNameIndicator)}
            text={active ? '−' : '+'}
            variant="mono"
            weight="medium"
          />
        )}
      </button>
      <div
        id={contentId}
        className={styles.content}
        style={{ maxHeight: active && height ? height : 0 }}
        aria-hidden={!active}
      >
        <div className={styles.wrapper} ref={ref}>
          {children || content}
        </div>
      </div>
    </div>
  );
};

export default AccordionItem;
