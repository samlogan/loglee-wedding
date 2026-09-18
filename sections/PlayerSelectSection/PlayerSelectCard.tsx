import { stegaClean } from '@sanity/client/stega';

import Link from '@/components/Link';
import ModelViewer from '@/components/ModelViewer';
import type { ModelViewerMode } from '@/components/ModelViewer';
import Tag from '@/components/Tag';
import Text from '@/components/Text';
import classNames from '@/helpers/classNames';
import type { IPlayerSelectSectionPlayer } from '@/tools/sanity/schema/sections/playerSelectSection';

import styles from './styles.module.scss';

export interface PlayerSelectCardProps {
  className?: string;
  /** Forwarded to `ModelViewer`. See `modelMode` on the section. */
  mode?: ModelViewerMode;
  /** A player the section has already checked has a name and a non-empty `playerPath`. */
  player: IPlayerSelectSectionPlayer;
  /** 1-based. Printed as `P1`, `P2` — the position is the only source of the label. */
  position: number;
}

/**
 * The player page's path segment: the slug with any stega payload and any stray slashes removed, or
 * `''` when nothing is left — which is the section's test for "this card has nowhere to go".
 *
 * Exported so the section's filter and the card's `href` are one function and cannot disagree. The
 * slashes matter because the Studio's slugify only runs on "Generate": a slug typed as `/sam` is
 * storable, and `//sam/` is a protocol-relative URL to a host called `sam`, not a path.
 */
export const playerPath = (slug?: string | null): string =>
  stegaClean(slug ?? '')
    .trim()
    .replaceAll(/^\/+|\/+$/g, '');

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
 * - the label row, because "P1" read aloud is noise and the name in the chip is already in the link's
 *   name. The visible "SAM" is still *contained* in "Play as Sam", which is what WCAG 2.5.3 asks for:
 *   a speech user saying "click Sam" reaches it.
 *
 * ## Draft mode, and the three values that must not carry stega
 *
 * In the Presentation tool every plain string arrives with an invisible stega payload appended (see
 * `tools/helpers/hasText.ts`). The chip renders `name` as it came, payload and all, because that is what
 * the overlay reads to offer click-to-edit. Three other uses are cleaned first:
 *
 * - the link's `aria-label`, which is spoken rather than overlaid;
 * - the `href`. `slug.current` is on the encoder's default deny-list, so it arrives clean today — but a
 *   path carrying the payload would be a 404, so this does not depend on a default;
 * - **`clips`**. `idle` and `hover` are not on the deny-list, so in draft mode each name arrives as
 *   `Excited_Walk_M` plus the payload. `resolveModelClip` matches names verbatim, then trimmed, then
 *   case-insensitively; `trim()` removes none of the zero-width characters the payload is made of, so
 *   no clip matched and the characters stood in their bind pose — only in the one view an editor
 *   checks their work in.
 */
const PlayerSelectCard = (props: PlayerSelectCardProps) => {
  const { className, mode = 'auto', player, position } = props;
  const { clips, fallbackImage, model, name, slug } = player;

  const plainName = stegaClean(name ?? '').trim();

  return (
    <Link
      ariaLabel={`Play as ${plainName}`}
      className={classNames(styles.card, className)}
      /*
       * Trailing slash because `next.config.js` sets `trailingSlash: true`: without it every click is a
       * 308 to the same path with one. The route itself is MAM-1901's, and 404s until it lands.
       */
      href={`/${playerPath(slug?.current)}/`}
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
          src={model?.asset?.url ?? undefined}
        />
      </div>
      <div aria-hidden="true" className={styles.label}>
        <Text
          as="span"
          className={styles.position}
          color="themeFgAccent"
          text={`P${position}`}
          variant="mono"
          weight="bold"
        />
        <Tag className={styles.name} label={name} uppercase variant="filled" weight="bold" />
      </div>
    </Link>
  );
};

export default PlayerSelectCard;
