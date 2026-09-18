import type { FC } from 'react';

import Section from '@/components/Section';
import Text from '@/components/Text';
import TextBlock from '@/components/TextBlock';
import TextTitle from '@/components/TextTitle';
import classNames from '@/helpers/classNames';
import hasBlockContent from '@/helpers/hasBlockContent';
import { getSectionSpacingProps, getSectionTheme } from '@/tools/helpers/section';
import type { IHeaderDisplaySection } from '@/tools/sanity/schema/sections/headerDisplaySection';

import styles from './styles.module.scss';

const HeaderDisplaySection: FC<IHeaderDisplaySection> = (props) => {
  const { title, content, items } = props;

  /*
   * An array field in Sanity keeps empty strings an editor tabbed through, and a blank item would
   * still draw a gap in a flex row. Filtering here rather than in the projection keeps the GROQ
   * readable and means a story passing raw mock data behaves the same as the CMS.
   */
  const metaItems = items?.filter((item) => Boolean(item?.trim()));
  /*
   * `hasBlockContent` and not `Boolean(content?.length)`. The length test handles the two shapes the
   * projection returns for an unset field — `null` and `[]` — but not the third: an editor who types
   * into the lede and deletes it leaves one `normal` block holding an empty child, which Sanity does
   * not unset. That reads as populated, `.row_split` applies, and the heading gives up half the row
   * to an empty column. `TextBlock` renders the empty `<p>` rather than bailing, so the guard has to
   * be here.
   */
  const hasLede = hasBlockContent(content);
  const hasMeta = Boolean(metaItems?.length);

  return (
    <Section
      name="HeaderDisplaySection"
      theme={getSectionTheme(props, 'light')}
      containerClassName={styles.container}
      {...getSectionSpacingProps(props)}
      /*
       * **After** the spread, deliberately. `getSectionSpacingProps` returns a hardcoded
       * `spacing: 'lg'` alongside the editor's two remove-spacing toggles, so a `spacing` written
       * before the spread is overwritten and silently dead — `yarn audit:layout` reports exactly
       * that ordering.
       *
       * `sm` rather than the helper's `lg`: the design draws 43.19px (1:615), 43.44px (16:121) and
       * 44px (1:307) above this header, and `--section-spacing-sm` measures 43.19px at a 1280px
       * viewport — exact on the frame it was read from. `lg` measures 74px there. The trade is at
       * the narrow end, where `sm` gives 16px against the 28px all three mobile frames draw; `md`
       * reverses that miss (24px narrow, −4px) but measures 58px at 1280 against the drawn 43.4,
       * and +14.6px at the top of a page-opening header is the more visible of the two. Left as
       * `sm` and raised at design review: no step on the scale carries the design's 28 → 43.4 ramp,
       * because the narrow anchors are inherited from the pre-fluid stepped scale rather than
       * measured from these comps.
       */
      spacing="sm"
    >
      <div className={classNames(styles.row, { [styles.row_split]: hasLede })}>
        {/*
         * `as="h1"` is forced rather than taken from the editor's choice in the TitleInput. This
         * section is the top of Planner, Stay and The Lodge, and the heading has to be each page's
         * one `h1` whichever tag somebody happened to pick in the Studio.
         *
         * `variant="display"` is the Archivo Black tier added above `--heading-*`; `size="md"`
         * resolves `--display-md` = fluid(56px, 132px), whose wide anchor is the 132px the three
         * desktop frames are set at. The token read 128px until it was corrected alongside this
         * section. The leading and tracking that go with it were wrong too — 1.05 and
         * -0.03em against the 0.84 and -0.045em every display heading in the design is drawn at —
         * and were fixed there rather than here; see `--display-line-height` in `_variables.scss`.
         */}
        <TextTitle
          className={styles.heading}
          title={title}
          as="h1"
          variant="display"
          size="md"
          textTransform="uppercase"
        />
        {(hasLede || hasMeta) && (
          <div className={styles.aside}>
            {hasLede && (
              /*
               * `size="2xl"` keeps the paragraph on the body scale; `styles.ledeText` re-points the
               * two tokens that step reads to the lede role's own pair — 17→22px on 23.8→29.7px,
               * which is what the design draws here and on the home hero. See the note on
               * `.ledeText` in styles.module.scss for why that is a token re-point rather than a
               * `font-size` in the module.
               *
               * `config.p` reaches both handlers: TextBlock maps a Portable Text `normal` block
               * through `config.span`, which itself spreads `config.p`, so the one override covers
               * `normal` and `p` alike.
               */
              <TextBlock blocks={content} config={{ p: { className: styles.ledeText, size: '2xl' } }} />
            )}
            {hasMeta && (
              /*
               * `role="list"` is not redundant — the global reset sets `list-style-type: none` on
               * every `ul`, and WebKit strips the `list` role from an unstyled list that does not
               * claim it back, so VoiceOver would announce these as loose text. Same reasoning as
               * `components/Footer`.
               */
              <ul className={styles.meta} role="list" aria-label="Key facts">
                {metaItems?.map((item) => (
                  /*
                   * Keyed by the item, not its index. These are short facts an editor reorders in
                   * place in a Sanity tag input, and an index key makes React keep the old text in
                   * the old node on a reorder.
                   *
                   * Safe because the schema enforces it: `items` carries `Rule.unique()`, without
                   * which a tags input would happily take "TBC" twice and hand React a duplicate
                   * key. The key and that rule have to move together.
                   */
                  <Text
                    as="li"
                    className={styles.metaItem}
                    key={item}
                    size="xs"
                    text={item}
                    textTransform="uppercase"
                    variant="mono"
                    weight="medium"
                  />
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </Section>
  );
};

export default HeaderDisplaySection;
