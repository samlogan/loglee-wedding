import type { ModelClipNames } from './modelClips';

export interface PickableModel {
  name: string;
  src?: string | null;
  clips?: ModelClipNames | null;
}

export interface ModelPick<T extends PickableModel> {
  model: T;
  /** The authored clip name to loop, or `undefined` when the player has none authored. */
  clip?: string;
}

/**
 * One model, and one of its animations, from a single random number in [0, 1).
 *
 * One number rather than two calls to `Math.random`, so a caller can hold the pick stable for as long
 * as it likes by holding one value — and a test can choose it. The integer part of `random × models`
 * picks the model; the fraction left over picks the clip, which spreads the two choices independently
 * across the range.
 *
 * Models with no file are skipped: there is nothing to show. A player's clips are the distinct names
 * authored across its idle, hover and feature roles — any of them can loop.
 */
const pickModel = <T extends PickableModel>(models: readonly T[], random: number): ModelPick<T> | undefined => {
  const usable = models.filter((model) => Boolean(model.src?.trim()));
  if (usable.length === 0) {
    return undefined;
  }

  const r = Math.min(Math.max(random, 0), 0.999_999);
  const scaled = r * usable.length;
  const model = usable[Math.floor(scaled)];

  const clips = [...new Set([model.clips?.idle, model.clips?.hover, model.clips?.feature])].filter(
    (name): name is string => Boolean(name?.trim())
  );
  const clip = clips.length > 0 ? clips[Math.floor((scaled % 1) * clips.length)] : undefined;

  return { clip, model };
};

export default pickModel;
