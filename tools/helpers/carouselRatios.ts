/**
 * The shapes a carousel slide can take, as width / height — a ladder fine enough that every
 * photograph has a close match, and a neighbour a step away when the closest is already taken.
 */
export const CAROUSEL_RATIOS = [9 / 16, 2 / 3, 3 / 4, 4 / 5, 1, 5 / 4, 4 / 3, 3 / 2, 16 / 10, 16 / 9, 2] as const;

/**
 * How far apart two shapes look — on a log scale, so 2:3 is exactly as far from 1:1 as 3:2 is.
 */
const distance = (a: number, b: number) => Math.abs(Math.log(a / b));

/**
 * A shape for each slide: the ladder step closest to the photograph's own shape, but never the same
 * as either of the two slides before it — so neighbours always differ, and so do their heights.
 *
 * The strip loops, so the last two slides sit before the first two: they also avoid the shapes the
 * first two were given. A photograph with no known shape is treated as square.
 *
 * Greedy and in order, which is what keeps each choice as close to its own photograph as the
 * constraint allows: a slide gives up its closest match only when a neighbour already has it, and
 * then takes the next closest.
 */
const carouselRatios = (natural: readonly (number | undefined)[]): number[] => {
  const chosen: number[] = [];
  const count = natural.length;

  for (let index = 0; index < count; index += 1) {
    const own = natural[index];
    const target = own && own > 0 ? own : 1;
    const taken = new Set<number>([chosen[index - 1], chosen[index - 2]].filter((ratio) => ratio !== undefined));

    // Across the loop's seam: the last slide sits before the first, the one before it before both.
    if (count > 3 && index >= count - 2) {
      taken.add(chosen[0]);
      if (index === count - 1) {
        taken.add(chosen[1]);
      }
    }

    const [best] = [...CAROUSEL_RATIOS]
      .filter((ratio) => !taken.has(ratio))
      .toSorted((a, b) => distance(a, target) - distance(b, target));

    chosen.push(best);
  }

  return chosen;
};

export default carouselRatios;
