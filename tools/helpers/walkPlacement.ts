/*=============================================>>>>>
= The RSVP rail's walking pair =
===============================================>>>>>*/

import type { DuetFraming, DuetPlacement } from './duetPlacement';

/**
 * The clip both characters walk on. Named as the files spell it (see `@/helpers/modelClips`); both
 * the bridal Lauren and the tuxedo Sam carry it. Fixed here rather than read from each player's
 * `idle`, because the scene is *walking together* — an editor changing one player's idle for the
 * home page should not have one of the pair start dancing in the rail.
 */
export const WALK_CLIP = 'Casual_Walk';

/**
 * Half the gap between the two marks. Side by side at the same depth, where the thank-you duet
 * staggers them: a walk barely swings the arms sideways, so 0.68m between the marks leaves daylight
 * between two walkers without reading as two separate people.
 */
const HALF_GAP = 0.34;

/**
 * Level with the pair's middle and far enough back to fit them head to toe with a little air.
 * `Casual_Walk` stays below standing height, so the top of the frame is the taller character's head
 * (~1.8m); 0.92m high and 3.6m back puts that and the feet inside the 32° frame with room to spare.
 * The same 32° lens as `ModelViewer` and the duet, so the characters are not a different shape here.
 */
export const WALK_FRAMING: DuetFraming = {
  camera: { fov: 32, position: [0, 0.92, 3.6] },
  shadow: { position: [0, 0, 0], scale: 4 },
  target: [0, 0.92, 0]
};

/**
 * Stand the players side by side, walking, facing the camera. The first model goes on the left.
 *
 * Two at most — it is a pair. A single model walks alone at the centre, so a missing player still
 * leaves the rail its character. Models without a file are skipped rather than placed as holes.
 */
export const walkPair = (models: { src?: string | null }[]): DuetPlacement[] => {
  const sources = models.flatMap((model) => (model.src ? [model.src] : [])).slice(0, 2);

  return sources.map((src, index) => ({
    clip: WALK_CLIP,
    position: [sources.length === 1 ? 0 : (index === 0 ? -1 : 1) * HALF_GAP, 0, 0],
    rotationY: 0,
    src
  }));
};
