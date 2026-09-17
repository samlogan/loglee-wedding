'use client';

import { ContactShadows } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { Suspense, useCallback, useLayoutEffect } from 'react';
import { NeutralToneMapping } from 'three';

import ModelBoundary from '@/components/ModelViewer/ModelBoundary';
import ModelCharacter, { preloadCharacter } from '@/components/ModelViewer/ModelCharacter';
import ModelLighting from '@/components/ModelViewer/ModelLighting';
import type { ModelEnvironmentPreset } from '@/components/ModelViewer/ModelLighting';
import { DUET_CAMERA, DUET_SHADOW, DUET_TARGET } from '@/helpers/duetPlacement';
import type { DuetPlacement } from '@/helpers/duetPlacement';

/**
 * The device-pixel-ratio cap, and the renderer options.
 *
 * Both are `ModelScene`'s, for the same reasons it gives at length — `[1, 2]` because a phone
 * reporting 3 renders nine times the pixels of a logical one for no visible gain, and Khronos PBR
 * Neutral because R3F's `ACESFilmicToneMapping` default pushes these particular models' skin warm.
 *
 * Restated here rather than imported from `ModelViewer`, deliberately. This canvas carries twice
 * the skinned geometry of that one, so its performance ceiling is genuinely a different question,
 * and a shared constant would mean tuning one surface silently retuned the other.
 */
const DPR: [number, number] = [1, 2];
const GL = { toneMapping: NeutralToneMapping, toneMappingExposure: 1 } as const;

/**
 * Points the camera at the pair.
 *
 * R3F's default camera looks at the world origin, which here is the floor between Lauren's feet and
 * Sam's — so without this the pair sits high in the frame with the ground plane cutting through
 * them. `ModelScene` gets away with rendering this conditionally because its player page hands the
 * camera to `OrbitControls`, which calls `lookAt` on every update; there are no controls on this
 * scene, so it always runs.
 */
const CameraTarget = () => {
  const camera = useThree((state) => state.camera);

  useLayoutEffect(() => {
    camera.lookAt(DUET_TARGET[0], DUET_TARGET[1], DUET_TARGET[2]);
  }, [camera]);

  return null;
};

interface DuetCharacterProps {
  placement: DuetPlacement;
  animate: boolean;
  onReady: (src: string) => void;
}

/**
 * One of the two, with its own stable `onClip`.
 *
 * A component rather than a callback built inside a `.map()`, and that is load-bearing:
 * `ModelCharacter` lists `onClip` among the dependencies of the effect that starts its rest clip,
 * so a fresh arrow per parent render would stop and restart the dance on every render — a visible
 * hitch with no cause anywhere near it. One component per character gives each a `useCallback` with
 * its own dependencies, which a loop cannot.
 */
const DuetCharacter = ({ animate, onReady, placement }: DuetCharacterProps) => {
  const { clip, position, rotationY, src } = placement;

  const handleClip = useCallback(() => onReady(src), [onReady, src]);

  return (
    <ModelCharacter
      animate={animate}
      /*
       * The clip is authored here rather than in the CMS, so it goes in as `idle` and is read back
       * as the rest role. That routes it through `resolveModelClip`, which buys the degradation for
       * free: a clip renamed by a re-export leaves the character standing in its bind pose rather
       * than throwing, and the scene still comes up with both figures in it.
       */
      clips={{ idle: clip }}
      // No hover on this scene — nothing here is a control, and the pair is not interactive.
      hoverSignal={0}
      onClip={handleClip}
      position={position}
      restClip="idle"
      rotationY={rotationY}
      src={src}
    />
  );
};

export interface ModelDuetSceneProps {
  /** Rendered back to front. Two in practice; an array because the scene has no reason to care. */
  characters: DuetPlacement[];
  /** `false` under reduced motion — both are posed and the frame loop goes on demand. */
  animate: boolean;
  environmentPreset: ModelEnvironmentPreset;
  /** Fired once per character as it lands in the scene, keyed by `src`. */
  onCharacterReady: (src: string) => void;
  /** The canvas or a model failed outright — the shell drops to the fallback image. */
  onError?: () => void;
}

/**
 * The WebGL half of `ModelDuet`, in its own module so `next/dynamic` has a chunk boundary to cut on.
 * Nothing above this file imports `three`, `@react-three/fiber` or `@react-three/drei`.
 */
const ModelDuetScene = (props: ModelDuetSceneProps) => {
  const { animate, characters, environmentPreset, onCharacterReady, onError } = props;

  return (
    <ModelBoundary label="duet canvas" onError={onError}>
      <Canvas
        camera={DUET_CAMERA}
        dpr={DPR}
        /*
         * `demand` under reduced motion: drawn when something asks for it and never on a timer.
         * With two characters posed and still, `always` would hold a `requestAnimationFrame` loop
         * open to redraw an identical frame sixty times a second — twice the geometry, for a
         * picture that does not change, on behalf of a reader who turned motion down to avoid
         * exactly that.
         */
        frameloop={animate ? 'always' : 'demand'}
        gl={GL}
        // No real-time shadows. The contact shadow below is a single ground pass, not a shadow map,
        // and two shadow-casting characters would add two depth renders per frame.
        shadows={false}
      >
        <ModelLighting preset={environmentPreset} />

        {/*
         * One suspense boundary around both, so the scene arrives as a pair.
         *
         * Two separate boundaries would let whichever GLB decoded first pop in alone and dance by
         * itself for however long the other took — on a slow connection, seconds. The pair is the
         * subject; half of it is not a useful intermediate state, and the shell is already painting
         * a placeholder underneath that costs nothing to keep up a moment longer.
         */}
        <Suspense fallback={null}>
          {characters.map((placement) => (
            <DuetCharacter animate={animate} key={placement.src} onReady={onCharacterReady} placement={placement} />
          ))}

          {/*
           * Seats both of them on the ground. `frames={1}` when nothing moves — the poses are fixed,
           * so re-baking the depth pass every frame would draw the same texture forever.
           *
           * **Inside the suspense boundary on purpose**, which is a trap `ModelScene` documents and
           * is worth repeating because it is invisible when you get it wrong: drei holds `frames`'
           * counter in its render scope, so `frames={1}` means "one bake per React render", not
           * "one ever". Mounted outside, the first demanded frame can arrive before the GLBs have
           * resolved and bake an empty scene — leaving the reduced-motion render with two
           * characters floating over no shadow at all.
           */}
          <ContactShadows
            blur={2.6}
            far={1.2}
            frames={animate ? Number.POSITIVE_INFINITY : 1}
            opacity={0.32}
            position={DUET_SHADOW.position}
            /*
             * 512 over a 5m plane is coarser per metre than `ModelViewer`'s 512 over 4m, and it
             * stays 512 anyway. The shadow is a soft blurred pool under two pairs of feet at
             * `opacity: 0.32`, so the resolution it wants is set by the blur rather than by the
             * plane; doubling it costs a second 1024² depth target on a canvas that is already
             * carrying two skinned meshes on a phone.
             */
            resolution={512}
            scale={DUET_SHADOW.scale}
          />
        </Suspense>

        <CameraTarget />
      </Canvas>
    </ModelBoundary>
  );
};

/**
 * Start both GLB downloads without mounting anything.
 *
 * Re-exported from `ModelCharacter` so `preload.ts` has one entry point into this chunk, and so the
 * `useGLTF` cache key (`src` plus `useDraco: false`) is written in exactly one place — preloading
 * under different loader options silently fills a different cache entry and buys nothing.
 */
export const preloadDuetScene = (sources: string[]) => {
  for (const src of sources) {
    preloadCharacter(src);
  }
};

export default ModelDuetScene;
