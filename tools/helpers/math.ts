export const lerp = (start: number, end: number, amount: number, allowNegatives = false) => {
  const result = start * (1 - amount) + end * amount;
  if (!allowNegatives && result < 0.0001) {
    return 0;
  }
  return result;
};

export const map = (value: number, x1: number, y1: number, x2: number, y2: number) =>
  ((value - x1) * (y2 - x2)) / (y1 - x1) + x2;

export const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max);

/**
 * Repeatable pseudo-random number in [min, max).
 * http://indiegamr.com/generate-repeatable-random-numbers-in-js/
 *
 * The defaults used to read `max = 0, min = 1`, which the guards below then resolved to `max = 1`
 * and `min = 1` — so `min + rnd * (max - min)` collapsed to `min`, and calling it with a seed alone
 * returned a constant `1` for every seed. Nothing calls it, so the fault was latent; the unit test
 * covering "different seeds give different values" is what surfaced it.
 */
export const seededRandom = (seed = 6, max = 1, min = 0) => {
  max = max || 1;
  min = min || 0;
  seed = (seed * 9301 + 49_297) % 233_280;
  const rnd = seed / 233_280;
  return min + rnd * (max - min);
};
