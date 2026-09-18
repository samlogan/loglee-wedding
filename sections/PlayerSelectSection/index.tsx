import type { FC } from 'react';

import type { ModelViewerMode } from '@/components/ModelViewer';
import Section from '@/components/Section';
import Text from '@/components/Text';
import hasText from '@/helpers/hasText';
import { getSectionSpacingProps, getSectionTheme } from '@/tools/helpers/section';
import type { IPlayerSelectSection } from '@/tools/sanity/schema/sections/playerSelectSection';

import { isSelectablePlayer } from './players';
import PlayerSelectCard from './PlayerSelectCard';

import styles from './styles.module.scss';

export interface PlayerSelectSectionProps extends IPlayerSelectSection {
  className?: string;
  /**
   * Forwarded to every card's `ModelViewer`. **The CMS never sets it**, and a page should not either:
   * the default, `auto`, is the viewer's own capability decision and is right everywhere.
   *
   * It exists for the same reason `ModelViewer` exposes `mode` at all. Headless Chromium rasterises in
   * software, so `auto` correctly resolves to the fallback there — which means no story could reach
   * the canvas, and the one behaviour worth proving through the section (the hover clip, and the arch
   * not moving when the canvas arrives) would be untestable. A force overrides the machine's guesses,
   * never the reader's `prefers-reduced-motion`.
   */
  modelMode?: ModelViewerMode;
}

/**
 * The home page's character select — Figma nodes 1:79 (desktop) and 1:124 (mobile).
 *
 * A framed panel with an optional corner caption and an optional centred prompt, over one card per
 * `player` document. The players are joined by the projection, not authored here; see
 * `queries.groq.ts` for why.
 *
 * ## The 3D never holds up the text
 *
 * This component is a server component and renders every word on the server: the caption, the prompt,
 * each position and each name. The canvases arrive afterwards, inside arches whose size is pure CSS —
 * so they are the right size in the server HTML and nothing moves when a character appears in one.
 * `ModelViewer` keeps `three` behind a `next/dynamic` boundary, so none of it is in the page's own
 * bundle either.
 *
 * ## Both models load eagerly (the MAM-1926 decision)
 *
 * Neither card defers its GLB. The two characters are on screen together, and a staggered reveal reads
 * as one broken card rather than as a loading strategy. That needs no code here: each `ModelViewer`
 * calls `preloadModel` itself the moment it knows it will render a canvas, so the two requests start in
 * the same commit.
 *
 * What the section deliberately does **not** do is call `preloadModel` earlier than that — at module
 * scope, or in an effect of its own. The viewer's call is gated on the capability check, and firing
 * ahead of it would download ~8MB of characters onto exactly the devices that then render the fallback
 * image instead: no WebGL, a software rasteriser, Data Saver, a ≤1GB phone. If deferral is ever wanted,
 * the lever is withholding the second card's `src` until idle or interaction and calling `preloadModel`
 * then — still without touching the viewer.
 */
const PlayerSelectSection: FC<PlayerSelectSectionProps> = (props) => {
  const { caption, className, modelMode, players, prompt } = props;

  /*
   * A card needs a name and somewhere to go. Both are required in the Studio, so a *published* player
   * always has them — but the drafts perspective (Presentation) returns drafts too, and a player
   * created a minute ago may have neither yet. Dropping it is better than the alternatives: a card
   * with no slug has no destination, and one with no name has no chip and a link announced as
   * "Play as". See `isSelectablePlayer` for the test itself.
   *
   * The positions are assigned after this, so `P1`/`P2` stay contiguous.
   */
  const selectable = players?.filter(isSelectablePlayer) ?? [];

  /*
   * Nothing at all rather than a prompt over an empty panel. "Select player" with no players to select
   * is a broken screen, not an empty state — and an editor who adds this section before creating any
   * players sees the reason in the prompt field's description.
   */
  if (selectable.length === 0) {
    return null;
  }

  const hasCaption = hasText(caption);
  const hasPrompt = hasText(prompt);

  return (
    <Section
      className={className}
      name="PlayerSelectSection"
      theme={getSectionTheme(props, 'light')}
      {...getSectionSpacingProps(props)}
      /*
       * **After** the spread, or the helper's hardcoded `spacing: 'lg'` overwrites it — `yarn
       * audit:layout` reports exactly that ordering.
       *
       * `sm` rather than `lg`: the home comps draw 36px between the hero and this panel at 1280 (1:44)
       * and 23px at 390 (1:102), and `lg` is 74px at 1280 on its own. `sm` (43px at 1280, 16px at 390)
       * is the nearest step. The page's three-section rhythm belongs to MAM-1900, which can also
       * remove either side from the Studio.
       */
      spacing="sm"
    >
      <div className={styles.panel}>
        {(hasCaption || hasPrompt) && (
          <div className={styles.header}>
            {/*
             * `2xs` is fluid(10px, 11px) against the comp's 11/9 (nodes 1:82, 1:127) — exact at
             * desktop, a pixel over at mobile, and the rung every other mono micro-label is on. The
             * regular weight is the comp's quiet register; the tracking is re-pointed in the stylesheet.
             *
             * **`.header`'s first grid row reserves one line at this step** (`--body-2xs` at the mono
             * leading), so that clearing the caption does not move the prompt. Change the size here and
             * that reservation has to change with it.
             *
             * `ariaHidden`, because the caption is panel chrome describing the canvases — "3D canvas ·
             * idle loop" — and the canvases are themselves hidden inside the cards' links. Read aloud it
             * was the first thing a screen reader met, before the heading, and it describes something that
             * is not in the accessibility tree (and says "idle loop" over a still image or a placeholder).
             */}
            {hasCaption && (
              <Text
                ariaHidden
                as="p"
                className={styles.caption}
                color="themeFgAccent"
                size="2xs"
                text={caption}
                textTransform="uppercase"
                variant="mono"
                weight="regular"
              />
            )}
            {/*
             * A heading, because it is what tells a screen-reader user what the two links after it are
             * for — navigating by heading lands here and the list follows. `h2` under the hero's `h1`.
             *
             * `sm` is `--body-sm`, fluid(12px, 14px) — the comp's 14 and 12 exactly (1:81, 1:126).
             */}
            {hasPrompt && (
              <Text
                alignment="center"
                as="h2"
                className={styles.prompt}
                color="themeFgDefault"
                size="sm"
                text={prompt}
                textTransform="uppercase"
                variant="mono"
                weight="bold"
              />
            )}
          </div>
        )}

        {/*
         * `role="list"` is not redundant: the reset strips `list-style-type`, and WebKit drops the list
         * role from an unstyled list that does not claim it back — VoiceOver would stop announcing
         * "list, 2 items". Same reasoning as `HeaderDisplaySection`'s meta list.
         */}
        <ul className={styles.players} role="list">
          {selectable.map((player, index) => (
            <li className={styles.player} key={player._id}>
              <PlayerSelectCard mode={modelMode} player={player} position={index + 1} />
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
};

export default PlayerSelectSection;
