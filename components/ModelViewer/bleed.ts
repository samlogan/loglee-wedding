/**
 * How far the canvas reaches past the arch, so a character's raised hand or swinging arm can leave
 * the dome instead of being cut off at its edge.
 *
 * Fractions of the arch: `top` of its height above it, `inline` of its width either side. Nothing
 * below — the character stands on the arch's floor, and the canvas has nothing to draw under it.
 *
 * One constant with two readers, which is why it lives in a module of its own. `index.tsx` sizes the
 * canvas holder from it, and `ModelScene` widens the camera's view by exactly the same margins so the
 * character keeps its size and its place in the arch. If the two disagree the figure grows or slides
 * rather than escaping. This file imports nothing, so the shell can read it without pulling `three`
 * over the chunk boundary.
 *
 * Sized against the framing in `ModelScene`: the arch shows about 1.3m across and 2.4m up. Arms
 * spread sideways reach roughly ±0.9m against the arch's ±0.65m, and hands raised over the head pass
 * its crown, so `inline` 0.3 (±1.04m) and `top` 0.2 (+0.48m) hold every clip in the two GLBs.
 */
export const MODEL_BLEED = { inline: 0.3, top: 0.2 } as const;

export type ModelBleed = typeof MODEL_BLEED;
