import type { FC } from 'react';

import Section from '@/components/Section';
import TextBlock from '@/components/TextBlock';
import TextTitle from '@/components/TextTitle';
import classNames from '@/helpers/classNames';
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
  const hasLede = Boolean(content?.length);
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
       * `sm` rather than the helper's `lg`: the design draws 43–44px above this header on every one
       * of the three desktop frames (nodes 1:307, 1:615, 16:121) and `--section-spacing-sm` resolves
       * to 43.8px at the 1280px frame. `lg` would be 74px. The trade is at the narrow end, where
       * `sm` gives 16px against the 28px the mobile frames draw; `md` reverses that miss and lands
       * 15px over at desktop, which is the more visible of the two on a page-opening header.
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
         * resolves `--display-md` = fluid(56px, 128px) against the 132px the three desktop frames
         * are set at. See the note in styles.module.scss about the leading, which is the one place
         * the token and the comp disagree.
         */}
        <TextTitle className={styles.heading} title={title} as="h1" variant="display" size="md" />
        {(hasLede || hasMeta) && (
          <div className={styles.aside}>
            {hasLede && (
              /*
               * `config.p` rather than a font-size in the module: `--body-2xl` = fluid(20px, 22px)
               * is the scale step the comp's 22px lede sits on. TextBlock maps a Portable Text
               * `normal` block through `config.span`, which itself spreads `config.p`, so the one
               * override covers both.
               */
              <TextBlock className={styles.lede} blocks={content} config={{ p: { size: '2xl' } }} />
            )}
            {hasMeta && (
              /*
               * `role="list"` is not redundant — the global reset sets `list-style-type: none` on
               * every `ul`, and WebKit strips the `list` role from an unstyled list that does not
               * claim it back, so VoiceOver would announce these as loose text. Same reasoning as
               * `components/Footer`.
               */
              <ul className={styles.meta} role="list">
                {metaItems?.map((item, index) => (
                  <li className={styles.metaItem} key={index}>
                    {item}
                  </li>
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
