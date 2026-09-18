'use client';

import { useId } from 'react';
import type { ReactNode } from 'react';

import classNames from '@/helpers/classNames';
import useElementHeight from '@/tools/hooks/useElementHeight';

import Text from '../../Text';

import styles from './styles.module.scss';

export interface AccordionItemProps {
  title: ReactNode | string;
  content?: string;
  children?: ReactNode;
  active?: boolean;
  setActive?: () => void;
  className?: string;
  classNameTrigger?: string;
  /**
   * An explicit accessible name for the trigger, for the case where `title` is a node carrying no
   * text of its own (an icon, an image). Omit it and the button is named by its own content, which
   * is what a disclosure should be — see the note on the `<button>` below.
   */
  ariaLabel?: string;
  /**
   * Wrap the trigger in a heading of this level, which is the ARIA APG accordion pattern
   * (`<h3><button aria-expanded …>`).
   *
   * Around the button, never inside it. A heading *inside* a button is flattened by the HTML-AAM
   * mapping — a button's content becomes a text alternative — so it publishes no outline entry at
   * all; around it, the entry is real and heading navigation works. That distinction is the whole
   * reason this is a prop rather than something a consumer can do from its own markup.
   *
   * Omitted by default, because a heading is only correct where the triggers really are section
   * headings within the page's outline, and only the consumer knows the surrounding level. Pass the
   * level *below* whatever heading introduces the accordion.
   */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
}

const AccordionItem = (props: AccordionItemProps) => {
  const { title, content, children, active, setActive, className, classNameTrigger, ariaLabel, headingLevel } = props;

  const classes = classNames(styles.item, { [styles.active]: active }, className);
  const id = useId();
  const contentId = `accordion-content-${id}`;

  const [ref, height] = useElementHeight({ disabled: !active });

  /*
   * A plain `<div>` when no level is given, so the DOM shape and the flex layout are identical
   * either way and a consumer that wants no heading pays nothing for the option.
   */
  const Header = headingLevel ? (`h${headingLevel}` as const) : 'div';

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
      <Header className={styles.header}>
        <button
          className={classNames(styles.title, classNameTrigger)}
          data-name="FAQTitle"
          /*
           * The UA default is `submit`, which is only harmless while no accordion sits inside a
           * form. This repo has a `FormSection`; the day the two meet, opening a question would
           * submit the form.
           */
          type="button"
          onClick={setActive}
          /*
           * `|| undefined`, never an empty string. An empty `aria-label` overrides the accessible
           * name to *nothing* rather than falling back to the element's content — strictly worse
           * than having no attribute, and axe reports it as "Buttons must have discernible text".
           * `components/Link` documents and guards the same case.
           */
          aria-label={ariaLabel || undefined}
          /*
           * Coerced, because `active` is optional. Inside `Accordion` it is always cloned to a
           * boolean, but an `Accordion.Item` rendered standalone would otherwise publish a button
           * with no expanded state at all rather than a collapsed one.
           */
          aria-expanded={!!active}
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
           * mono-font()`. `size` is omitted on purpose: the three mono rungs top out at 14px and
           * this is drawn at 20px, so the module keeps its own `font-size`, which is the documented
           * way to opt out of the rung list.
           *
           * Not `components/Tag`, deliberately. `Tag` is presentational *and* non-interactive by
           * construction — no handler, no `href`, no `tabindex`, no role, asserted by its own
           * `NotInteractive` story — and this chip sits inside the trigger's hit area. Same shape,
           * different object.
           *
           * `aria-hidden`, for the reason the label note above gives: `aria-expanded` already
           * announces the state, and without this the button's computed name would gain a trailing
           * "+" or "−". The glyph is U+2212 MINUS SIGN rather than a hyphen — it is drawn at the
           * plus's own width, so the chip does not reflow between states.
           */}
          {(!!children || !!content) && (
            <Text
              alignment="center"
              ariaHidden
              as="span"
              className={styles.indicator}
              text={active ? '−' : '+'}
              variant="mono"
              weight="medium"
            />
          )}
        </button>
      </Header>
      {/*
       * ## A collapsed panel must be `inert`, not merely clipped
       *
       * `max-height: 0` with `overflow: hidden` hides the panel visually and removes it from nothing
       * else: not the tab order, and not the accessibility tree except for the `aria-hidden` below.
       * That combination is the worst of both — an answer's rich text can contain a link
       * (`components/TextBlock` maps the `link` mark to a real `<a href>`), so a keyboard user could
       * Tab onto an anchor clipped to zero height, with the focus ring nowhere on screen (WCAG
       * 2.4.7, 2.4.3), inside an `aria-hidden` subtree, which is an explicit ARIA authoring
       * violation and makes what a screen reader says browser-dependent (4.1.2, axe
       * `aria-hidden-focus`).
       *
       * Verified rather than reasoned: a probe `<a href>` appended into a collapsed panel and given
       * `.focus()` became `document.activeElement`. It was latent only because no answer in the
       * dataset happens to contain a link yet.
       *
       * `inert` takes the whole subtree out of both the tab order and the accessibility tree, and as
       * a boolean attribute in React 19 `inert={false}` omits it rather than writing the string
       * `"false"` — which the older form would have made permanently inert. `components/Header`'s
       * mobile panel states the same thing for the same reason. `aria-hidden` is kept because it
       * costs nothing and says the same thing to anything that reads attributes rather than
       * computed inertness.
       */}
      <div
        id={contentId}
        className={styles.content}
        style={{ maxHeight: active && height ? height : 0 }}
        aria-hidden={!active}
        inert={!active}
      >
        <div className={styles.wrapper} ref={ref}>
          {children || content}
        </div>
      </div>
    </div>
  );
};

export default AccordionItem;
