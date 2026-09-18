import type { FC } from 'react';

import Link from '@/components/Link';
import Section from '@/components/Section';
import Text from '@/components/Text';
import TextBlock from '@/components/TextBlock';
import TextTitle from '@/components/TextTitle';
import hasBlockContent from '@/helpers/hasBlockContent';
import stripTitleTags from '@/helpers/stripTitleTags';
import { getSectionSpacingProps, getSectionTheme } from '@/tools/helpers/section';
import type { IFaqSection } from '@/tools/sanity/schema/sections/faqSection';

import FaqItems from './FaqItems';
import FaqMapCard from './FaqMapCard';

import styles from './styles.module.scss';

/**
 * The FAQ band — an info rail on the left, a numbered accordion on the right (nodes 16:610 desktop,
 * 16:719 mobile).
 *
 * ## Mobile reading order is DOM order
 *
 * The comp stacks header → map → accordion → button, and that is the order these four things are
 * written in below: the map is the last child of the left column, the button the last child of the
 * right one, and the left column comes first. Nothing here reorders with `order` or `grid-row`, and
 * that is the point rather than an accident — both properties move paint only, so a visually correct
 * stack built from them still tabs and reads in source order. The single `flex-direction` flip in
 * `styles.module.scss` is the whole responsive behaviour.
 *
 * ## The button lives in the right column
 *
 * It used to sit under the intro copy on the left. It now closes the accordion (node 16:714), below
 * the rule the last item draws — which is why `styles.module.scss` no longer strips that last
 * border.
 *
 * ## Known departure from its sibling pages
 *
 * The comp absorbs the page's display heading ("FAQ" at 132px) into this section rather than putting
 * a `headerDisplaySection` above it. This section keeps its own `heading`/`lg` title tier, so the top
 * of `/faq` reads typographically differently from `/stay` and `/planner`. Flagged for design rather
 * than fixed here: making the title a display tier changes every other page that uses this section,
 * and the fix — if design wants one — is a `headerDisplaySection` above it, not a new size prop.
 */
const FaqSection: FC<IFaqSection> = (props) => {
  const { tagline, title, content, addMap, map, addButton, buttonEyebrow, button, faqItems } = props;

  const theme = getSectionTheme(props, 'light');
  /*
   * The map bar's contents resolve against the inverse of the page — see the note on
   * `FaqMapCard`'s `accentTheme` prop. Computed here because this is where the page's theme is
   * known; the card itself takes no view on what the page is.
   */
  const accentTheme: ProjectTheme = theme === 'dark' ? 'light' : 'dark';

  /*
   * `stripTitleTags(title).text.trim()` and **not** `title?.trim()`. `title` arrives from
   * `TitleInput` as markup — `'<h2>FAQ</h2>'` — so a field an editor emptied is the string
   * `'<h2></h2>'`, which is truthy and trims to itself. Testing the raw value means every title
   * field anyone has ever touched counts as filled in. `TwoColumnListSection` records the same trap.
   */
  const hasTitle = Boolean(stripTitleTags(title).text.trim());
  const hasHeader = Boolean(tagline?.trim()) || hasTitle;
  /*
   * `addMap` gates the whole card, and the projection is gated on the same boolean — so on a section
   * with the toggle off, `map` is not merely empty, it is absent. Testing the toggle rather than the
   * object is what keeps the two halves of that decision in agreement.
   */
  const hasMap = Boolean(addMap) && Boolean(map);
  const hasInfo = hasHeader || hasBlockContent(content) || hasMap;
  const hasFooter = Boolean(addButton) && Boolean(button?.label);

  return (
    <Section
      name="FaqSection"
      theme={theme}
      {...getSectionSpacingProps(props)}
      /*
       * The layout switch is a container query on this section's own content box, so the `Container`
       * has to be the query container. See the head of `styles.module.scss` for why it is keyed to
       * the section rather than to the window, and why its threshold is in `px`.
       */
      containerClassName={styles.queryContainer}
    >
      <div className={styles.contentContainer}>
        {hasInfo && (
          <div className={styles.infoContainer}>
            {hasHeader && (
              <div className={styles.infoHeader}>
                {/*
                 * The eyebrow this section has always had a field for and never rendered — the
                 * component destructured five props and `tagline` was not one of them, so "HELP
                 * MENU" (node 16:638) was dropped on the floor for every instance.
                 *
                 * `variant="mono"` with `weight="bold"` selects the loud register (0.2em), which is
                 * the comp's 2.6px on 13px exactly. Same call as `TwoColumnListSection.eyebrow` and
                 * `ScheduleSection.eyebrow`; the size pair and the ink live in the stylesheet.
                 */}
                {Boolean(tagline?.trim()) && (
                  <Text
                    as="p"
                    className={styles.tagline}
                    text={tagline}
                    textTransform="uppercase"
                    variant="mono"
                    weight="bold"
                  />
                )}
                {hasTitle && <TextTitle title={title} variant="heading" size="lg" />}
              </div>
            )}
            {hasBlockContent(content) && (
              /*
               * `hasBlockContent` rather than `content?.length`: an editor who types into a
               * rich-text field and clears it leaves one `normal` block holding an empty child,
               * which Sanity does not unset. `.length` is 1, and the rail gains a dead line plus a
               * 24px gap above the map.
               */
              <TextBlock blocks={content} config={{ p: { className: styles.introText, size: 'lg' } }} />
            )}
            {hasMap && map && <FaqMapCard {...map} accentTheme={accentTheme} />}
          </div>
        )}
        <div className={styles.accordionColumn}>
          {faqItems && faqItems?.length > 0 && <FaqItems faqItems={faqItems} />}
          {hasFooter && (
            <div className={styles.footer}>
              {/*
               * "STILL STUCK?" (node 16:716) — desktop only, dropped by the mobile comp. Hidden in
               * CSS rather than omitted from the markup: it is a caption on a control that is still
               * there, so a reader using a narrow window or a zoomed page has lost nothing but a
               * decoration. See the stylesheet for why the query is in `px`.
               */}
              {Boolean(buttonEyebrow?.trim()) && (
                <Text
                  as="p"
                  className={styles.footerEyebrow}
                  text={buttonEyebrow}
                  textTransform="uppercase"
                  variant="mono"
                />
              )}
              {/*
               * The design's outlined ink pill (node 16:717), where this used to render a filled
               * pine `rounded` button. `theme` is required alongside `outline` — the pair
               * `outline` + no theme is one of the three combinations CLAUDE.md closes in CSS
               * rather than in the types.
               */}
              <Link
                {...button?.link}
                className={styles.footerButton}
                outline
                size="md"
                theme="secondary"
                variant="pill"
                text={button?.label}
              />
            </div>
          )}
        </div>
      </div>
    </Section>
  );
};

export default FaqSection;
