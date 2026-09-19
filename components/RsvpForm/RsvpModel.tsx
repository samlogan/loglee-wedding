'use client';

import { useSyncExternalStore } from 'react';

import ModelViewer from '@/components/ModelViewer';
import classNames from '@/helpers/classNames';
import type { ModelClipNames } from '@/helpers/modelClips';
import pickModel from '@/helpers/pickModel';

import styles from './styles.module.scss';

export interface RsvpModelOption {
  name: string;
  src?: string | null;
  clips?: ModelClipNames | null;
  fallbackImage?: SanityImageSimple | null;
}

/*
 * The roll, held as an external store rather than state. The server has no opinion — its snapshot is
 * `null`, so it renders an empty stage and hydration matches — and the client rolls once when first
 * read. Unmounting clears it, so every visit to the page gets a fresh roll, while re-renders within
 * one visit keep the same character rather than swapping on every keystroke in the form.
 *
 * `useSyncExternalStore` rather than `useState` + `useEffect`, per the React Compiler conventions in
 * CLAUDE.md: no state is set in an effect.
 */
let roll: number | undefined;
const subscribe = () => () => {
  roll = undefined;
};
const getRoll = () => {
  roll ??= Math.random();
  return roll;
};
const getServerRoll = () => null;

export interface RsvpModelProps {
  className?: string;
  models: RsvpModelOption[];
}

/**
 * One of the players' 3D characters, chosen at random each visit, looping one of their animations —
 * also at random. The rail's companion to the questions beside it.
 *
 * The animation is any of the clip names authored on the player (idle, hover or feature), looped as
 * the rest clip. Everything else — the capability check, reduced motion, the fallback image — is
 * `ModelViewer`'s, unchanged.
 */
const RsvpModel = (props: RsvpModelProps) => {
  const { className, models } = props;

  const random = useSyncExternalStore(subscribe, getRoll, getServerRoll);
  const pick = random === null ? undefined : pickModel(models, random);

  if (models.length === 0) {
    return null;
  }

  const name = pick?.model.name;

  return (
    <ModelViewer
      alt={name ? `${name}, as a 3D character` : 'One of the couple, as a 3D character'}
      // No arch: in the rail the character stands on the page, not in the select screen's shape.
      backdrop={false}
      className={classNames(styles.model, className)}
      clips={pick?.clip ? { idle: pick.clip } : undefined}
      fallbackImage={pick?.model.fallbackImage}
      restClip="idle"
      src={pick?.model.src ?? undefined}
    />
  );
};

export default RsvpModel;
