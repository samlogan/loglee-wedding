'use client';

import ModelDuet from '@/components/ModelDuet';
import classNames from '@/helpers/classNames';
import type { ModelClipNames } from '@/helpers/modelClips';
import { WALK_FRAMING, walkPair } from '@/helpers/walkPlacement';

import styles from './styles.module.scss';

export interface RsvpModelOption {
  name: string;
  src?: string | null;
  clips?: ModelClipNames | null;
  fallbackImage?: SanityImageSimple | null;
}

export interface RsvpModelProps {
  className?: string;
  models: RsvpModelOption[];
}

/**
 * The players' 3D characters walking side by side — the rail's companion to the questions beside it.
 *
 * Both walk on `Casual_Walk`, facing the camera, at the same depth (see `@/helpers/walkPlacement`).
 * The models come from the player documents, so a model swapped in Sanity shows here too. The rest —
 * the capability check, reduced motion, the fallback image — is `ModelDuet`'s, unchanged.
 *
 * It used to be one player chosen at random per visit, looping one of their clips at random. A pair
 * says "the two of us" in a way a single character cannot, and it drops the random roll, which was
 * the only reason this component needed an external store.
 */
const RsvpModel = (props: RsvpModelProps) => {
  const { className, models } = props;
  const characters = walkPair(models);

  if (characters.length === 0) {
    return null;
  }

  const names = models
    .filter((model) => model.src)
    .slice(0, 2)
    .map((model) => model.name);
  const alt =
    names.length === 2
      ? `${names[0]} and ${names[1]}, as 3D characters, walking side by side`
      : `${names[0]}, as a 3D character, walking`;

  return (
    <ModelDuet
      alt={alt}
      // No stage fill: in the rail the pair walks on the page, as the single character stood on it.
      backdrop={false}
      characters={characters}
      className={classNames(styles.model, className)}
      fallbackImage={models.find((model) => model.fallbackImage?.asset?.url)?.fallbackImage}
      framing={WALK_FRAMING}
    />
  );
};

export default RsvpModel;
