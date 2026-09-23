/**
 * How different two neighbouring slides must be, on the log scale below: about 6%. Enough that two
 * photographs shot the same way read as two different shapes and sit at two different heights.
 */
export const MIN_DIFFERENCE = Math.log(1.06);

/**
 * The furthest a slide may move from its photograph's own shape, on the same log scale: about 16%.
 * Only reached when two neighbours straddle a photograph closely; a run of photographs shot the same
 * way moves by `MIN_DIFFERENCE`, about 6%.
 */
export const MAX_NUDGE = 0.16;

/** The search's step, on the same log scale — half a percent. */
const STEP = 0.005;

/**
 * How far apart two shapes look — on a log scale, so 2:3 is exactly as far from 1:1 as 3:2 is.
 */
const distance = (a: number, b: number) => Math.abs(Math.log(a / b));

/**
 * A shape for each slide: the photograph's own, unless that is too close to one of the two slides
 * before it — then nudged narrower or wider by the smallest amount that clears both, searched outward
 * in half-percent steps.
 *
 * So most photographs are shown whole, and a run of photographs shot the same way steps through
 * slightly different shapes — and, because slides share a width, slightly different heights — rather
 * than marching past as identical tiles. The crop a nudge costs is the nudge: usually about 6%.
 *
 * The strip loops, so the last two slides sit before the first two: they also avoid the shapes the
 * first two were given. A photograph with no known shape is treated as square.
 *
 * Greedy and in order: a slide changes only when a neighbour it has already met is too close.
 */
const carouselRatios = (natural: readonly (number | undefined)[]): number[] => {
  const chosen: number[] = [];
  const count = natural.length;
  // Which way the last nudge went, so a run of identical photographs goes narrower, wider, narrower.
  let lastDirection = 1;

  for (let index = 0; index < count; index += 1) {
    const own = natural[index];
    const target = own && own > 0 ? own : 1;
    const neighbours = [chosen[index - 1], chosen[index - 2]].filter((ratio) => ratio !== undefined);

    // Across the loop's seam: the last slide sits before the first, the one before it before both.
    if (count > 3 && index >= count - 2) {
      neighbours.push(chosen[0]);
      if (index === count - 1) {
        neighbours.push(chosen[1]);
      }
    }

    const clears = (ratio: number) => neighbours.every((neighbour) => distance(ratio, neighbour) >= MIN_DIFFERENCE);

    if (clears(target)) {
      chosen.push(target);
      continue;
    }

    // Nudges in order of size, each size trying the opposite direction to the last nudge first.
    const preferred = -lastDirection;
    const candidates = Array.from({ length: Math.round(MAX_NUDGE / STEP) }, (_, index) => (index + 1) * STEP).flatMap(
      (size) => [preferred, -preferred].map((direction) => ({ direction, ratio: target * Math.exp(direction * size) }))
    );
    const nudge = candidates.find(({ ratio }) => clears(ratio));

    if (nudge) {
      chosen.push(nudge.ratio);
      lastDirection = nudge.direction;
      continue;
    }

    // Nothing within `MAX_NUDGE` clears every neighbour — only possible when the neighbours
    // themselves crowd the photograph. Take whichever candidate is furthest from the nearest one.
    const nearest = (ratio: number) => Math.min(...neighbours.map((neighbour) => distance(ratio, neighbour)));
    const [fallback] = candidates.toSorted((a, b) => nearest(b.ratio) - nearest(a.ratio));
    chosen.push(fallback.ratio);
    lastDirection = fallback.direction;
  }

  return chosen;
};

export default carouselRatios;
