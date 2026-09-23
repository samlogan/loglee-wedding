/**
 * The most photographs the image carousel shows at once. A published list can run to fifty; twelve
 * keeps the strip's loop long enough to feel varied and its downloads to what a visit will see.
 */
export const MAX_SLIDES = 12;

/**
 * A small seeded generator (Park–Miller's minimal standard), so one seed always gives the same order:
 * the carousel re-renders on hover and resize, and must not reshuffle each time it does. Plain
 * multiplication and remainder, which stay exact in a double (16807 × 2³¹ < 2⁵³).
 */
const MODULUS = 2_147_483_647;
const seeded = (seed: number) => {
  let state = 1 + Math.floor(seed * (MODULUS - 1));
  return () => {
    state = (state * 16_807) % MODULUS;
    return (state - 1) / (MODULUS - 1);
  };
};

/**
 * Up to `max` of the items, chosen and ordered at random by `seed` (a number in [0, 1)).
 *
 * With no seed — the server render, and the first client render that has to match it — the first
 * `max` in their published order. A seed shuffles the whole list first (Fisher–Yates), so every item
 * is as likely as any other to be among the ones shown, not just the ones near the top.
 */
const pickSlides = <T>(items: readonly T[], max: number = MAX_SLIDES, seed?: number | null): T[] => {
  if (seed === null || seed === undefined) {
    return items.slice(0, max);
  }

  const random = seeded(seed);
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
  }
  return shuffled.slice(0, max);
};

export default pickSlides;
