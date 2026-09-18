import type { FC } from 'react';

import Link from '@/components/Link';
import Section from '@/components/Section';
import TextBlock from '@/components/TextBlock';
import type { TextBlockProps } from '@/components/TextBlock';
import hasBlockContent from '@/helpers/hasBlockContent';
import hasDestination from '@/helpers/hasDestination';
import hasText from '@/helpers/hasText';
import resolveRsvpAction from '@/helpers/rsvpAction';
import { getSectionSpacingProps, getSectionTheme } from '@/tools/helpers/section';
import type { IClosingCtaSection } from '@/tools/sanity/schema/sections/closingCtaSection';

import styles from './styles.module.scss';

/*
 * The intro in the lede role — the paragraph `HeaderDisplaySection` sets beside its heading, and the
 * one `--body-lede` was measured from (this section's own nodes, 1:73 and 1:121). `size="2xl"` keeps
 * it on the body scale and `styles.ledeText` re-points that step's two tokens to the lede's pair; see
 * the note in `styles.module.scss`. `config.p` reaches the `normal` blocks too, because TextBlock's
 * `span` handler spreads it.
 *
 * Module scope because it depends on nothing the section is given.
 */
const LEDE_CONFIG: TextBlockProps['config'] = { p: { className: styles.ledeText, size: '2xl' } };

/**
 * The home page's closing block: the intro on the left, "The Weekend" and the RSVP action on the
 * right, sitting on one bottom edge (nodes 1:71 desktop, 1:119 mobile). On a phone the RSVP action
 * stands alone at full width — see the head of `styles.module.scss` for how the two widths switch.
 *
 * ## Every part is optional, and each absence takes its space with it
 *
 * The intro, the secondary button and the RSVP action are each tested before anything is drawn for
 * them, so a missing one leaves no empty wrapper behind to hold a flex gap open. With none of the
 * three there is nothing to show, and the section renders nothing rather than an empty band of
 * padding in the page.
 *
 * An action counts only when it has a label **and** somewhere to go. `Link` draws an inert `<span>`
 * for a link it cannot resolve, and a filled pill that does nothing is worse than no pill, so both
 * actions ask `hasDestination` first. For the RSVP action that goes one step past the header, which
 * draws its pill whenever there is a label — see `tools/helpers/rsvpAction` for where the two agree
 * and that one place they do not.
 */
const ClosingCtaSection: FC<IClosingCtaSection> = (props) => {
  const { content, addButton, button, showRsvp, rsvp } = props;

  /*
   * Each block kept only if it has text of its own, by the same test the section applies to the whole.
   *
   * An editor who presses Enter after the paragraph saves an empty block behind it, and `TextBlock`
   * renders every block it is handed. The empty one is the last child, so the real paragraph is not,
   * and keeps its 16px of paragraph spacing — which lifts the text off the shared bottom edge the
   * actions are aligned to, by exactly that much. Dropping blanks is what keeps the paragraph's last
   * line the band's bottom edge.
   */
  const intro = content?.filter((block) => hasBlockContent([block]));
  const hasIntro = Boolean(intro?.length);
  const secondary =
    addButton && button?.label && hasText(button.label) && hasDestination(button.link) ? button : undefined;
  /*
   * Label and destination from the header and the wedding singleton, through the helper the header
   * itself uses — so this button and the nav pill read the same reply-by line or fall back the same
   * way. `showRsvp` is `!== false` rather than truthy, matching the projection's `!= false`: an
   * instance saved before the field existed has it unset, and the action is on by default.
   */
  const rsvpAction = showRsvp === false ? undefined : resolveRsvpAction(rsvp);
  const primary = rsvpAction && hasDestination(rsvpAction.link) ? rsvpAction : undefined;

  if (!hasIntro && !secondary && !primary) {
    return null;
  }

  return (
    <Section
      /*
       * Carries one thing: a re-point of the two spacing steps chosen below to this band's drawn pairs.
       * It has to be on the element `.spacing_top_md` / `.spacing_bottom_lg` sit on and read from. See
       * the note in `styles.module.scss`.
       */
      className={styles.section}
      containerClassName={styles.container}
      name="ClosingCtaSection"
      theme={getSectionTheme(props, 'light')}
      {...getSectionSpacingProps(props)}
      /*
       * After the spread, because `getSectionSpacingProps` returns a hardcoded `spacing: 'lg'` beside
       * the editor's two remove-spacing toggles and would overwrite anything written before it.
       *
       * `md` above and `lg` below: the stock steps nearest the comp (drawn 30.7 → 55.2px above and
       * 40 → 64px below), which `styles.section` then re-points to exactly those ramps.
       */
      spacing={['md', 'lg']}
    >
      <div className={styles.row}>
        {hasIntro && intro && <TextBlock blocks={intro} className={styles.intro} config={LEDE_CONFIG} />}
        {(secondary || primary) && (
          <div className={styles.actions}>
            {/*
             * First, because the comp reads "The Weekend" and then the RSVP action — DOM order is the
             * visual order at every width, so the tab order is too.
             *
             * `theme="secondary" outline` draws the comp's ink border and ink label (#131412 on
             * light, node 1:75) out of `--button-secondary-bg`, and fills with it on hover. Hidden on
             * a phone by `styles.secondary`, from the same field rather than a mobile-only one.
             */}
            {secondary && (
              <Link {...secondary.link} className={styles.secondary} outline size="md" theme="secondary" variant="pill">
                {secondary.label}
              </Link>
            )}
            {/*
             * The pine pill (node 1:77). `size="md"` is the size the button tokens were measured from
             * — "the hero's 'The Weekend' / 'RSVP by 01.12.26' pills" in `_variables.scss`.
             * `fullWidthMobile` spans the column below the `tablet` breakpoint, which is also where
             * the secondary action leaves, so the phone shows this alone and full width (node 1:122).
             */}
            {primary && (
              <Link {...primary.link} fullWidthMobile size="md" theme="primary" variant="pill">
                {primary.longLabel}
              </Link>
            )}
          </div>
        )}
      </div>
    </Section>
  );
};

export default ClosingCtaSection;
