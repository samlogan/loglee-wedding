import { stegaClean } from '@sanity/client/stega';

import Link from '@/components/Link';
import ModelViewer from '@/components/ModelViewer';
import type { ModelViewerMode } from '@/components/ModelViewer';
import Tag from '@/components/Tag';
import Text from '@/components/Text';
import classNames from '@/helpers/classNames';

import { playerPath } from './players';
import type { SelectablePlayer } from './players';

import styles from './styles.module.scss';

export interface PlayerSelectCardProps {
  className?: string;
  /** Forwarded to `ModelViewer` untouched; the viewer owns the default. See `modelMode` on the section. */
  mode?: ModelViewerMode;
  /** Only a player that has been through `isSelectablePlayer` — one with a name and a path. */
  player: SelectablePlayer;
  /** 1-based. Printed as `P1`, `P2` — the position is the only source of the label. */
  position: number;
}

/**
 * One character card: the arch, then the position and the name, and the whole thing one link to the
 * player's page (nodes 1:84 / 1:93 desktop, 1:129 / 1:138 mobile).
 *
 * ## One link, one name
 *
 * The card is a real `<a>` — reachable by Tab, announced as a link, activated by Enter — rather than a
 * click handler on the canvas, which a keyboard or screen-reader user could never reach. Its name is
 * `aria-label`, "Play as Sam", and **everything inside it is `aria-hidden`**:
 *
 * - the arch, because `ModelViewer` names whatever is in it (the canvas holder, the fallback `<img>` or
 *   the placeholder) with `alt`. Inside a link that already says "Sam", that is the name read a second
 *   time. `alt` is still written properly — the prop is required and a component that is later lifted
 *   out of this wrapper should not arrive with an invented description.
 * - the label row, because the name in the chip is already in the link's name, and "P1" is an ordinal
 *   the list already conveys ("1 of 2"). The visible "SAM" is still *contained* in "Play as Sam", which
 *   is what WCAG 2.5.3 asks of a speech user saying "click Sam". Leaving "P1" out of the name is a
 *   judgement: it is read as the card's position, not as its label.
 *
 * ## Draft mode, and the values that must not carry stega
 *
 * In the Presentation tool every plain string arrives with an invisible stega payload appended (see
 * `tools/helpers/hasText.ts`). The chip renders `name` as it came, payload and all, because that is what
 * the overlay reads to offer click-to-edit. Everything else that reads a CMS string is cleaned first:
 *
 * - the link's `aria-label`, which is spoken rather than overlaid;
 * - the `href` and the GLB's `src`. Both are on the encoder's default deny-list today (`slug.current`
 *   by name, the asset URL because it is a URL), but a path or a file URL carrying the payload would be
 *   a 404, so neither depends on a default;
 * - **`clips`**. `idle` and `hover` are not on the deny-list, so in draft mode each name arrives as
 *   `Excited_Walk_M` plus the payload. `resolveModelClip` matches names verbatim, then trimmed, then
 *   case-insensitively; `trim()` removes none of the zero-width characters the payload is made of, so
 *   no clip matched and the characters stood in their bind pose — only in the one view an editor
 *   checks their work in.
 */
const PlayerSelectCard = (props: PlayerSelectCardProps) => {
  const { className, mode, player, position } = props;
  const { clips, fallbackImage, model, name, slug } = player;

  const plainName = stegaClean(name).trim();

  return (
    <Link
      ariaLabel={`Play as ${plainName}`}
      className={classNames(styles.card, className)}
      /*
       * Trailing slash because `next.config.js` sets `trailingSlash: true`: without it every click is a
       * 308 to the same path with one. The routes are MAM-1901's player pages, built in code for the
       * `sam` and `lauren` slugs — a player with any other slug links to a 404, which the player's
       * slug field tells an editor.
       */
      href={`/${playerPath(slug.current)}/`}
      // The comp's own 8px rounding on the card (1:84) — and the shape the focus ring follows.
      variant="rounded"
    >
      <div aria-hidden="true" className={styles.arch}>
        {/*
         * `interactive` plays the player's hover clip once on pointer enter or tap and returns to idle.
         * Pointer-only by design — see the prop's note in `components/ModelViewer`: the motion is
         * decoration, and the control a keyboard reader needs is this link.
         *
         * `priority` because both arches are above the fold on both comps, and the fallback `<img>` is
         * the one thing in the arch that can be an LCP candidate — on exactly the devices (no WebGL, a
         * software rasteriser, Data Saver) least able to absorb a lazy load.
         *
         * No `badge`. The comp prints `sam-idle.glb` in a chip on each arch, which the ticket leaves out
         * pending design review.
         */}
        <ModelViewer
          alt={`${plainName}, as a 3D character`}
          className={styles.viewer}
          clips={stegaClean(clips)}
          fallbackImage={fallbackImage}
          interactive
          mode={mode}
          priority
          src={stegaClean(model?.asset?.url) ?? undefined}
        />
      </div>
      <div aria-hidden="true" className={styles.label}>
        {/*
         * `xs` is fluid(11px, 12px) against the drawn 11 and 13 (1:135, 1:90): exact on the phone, a
         * pixel under on the desktop, and a step on the scale rather than a size set in the stylesheet.
         * The chip is re-pointed to the same step in `.name`, so the two stay one size.
         */}
        <Text as="span" color="themeFgAccent" size="xs" text={`P${position}`} variant="mono" weight="bold" />
        <Tag className={styles.name} label={name} uppercase variant="filled" weight="bold" />
      </div>
    </Link>
  );
};

export default PlayerSelectCard;
