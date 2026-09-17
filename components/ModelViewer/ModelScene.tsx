'use client';

import { ContactShadows, OrbitControls } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { Suspense, useLayoutEffect } from 'react';
import { NeutralToneMapping } from 'three';

import type { ModelClipNames, ModelClipRole } from '@/helpers/modelClips';

import ModelBoundary from './ModelBoundary';
import ModelCharacter, { preloadCharacter } from './ModelCharacter';
import ModelLighting from './ModelLighting';
import type { ModelEnvironmentPreset } from './ModelLighting';

/**
 * The camera.
 *
 * `fov` is the harness's (`app/dev/models/ModelHarness.tsx`), where it was judged against the real
 * characters; the distance is not. `fov` in three is **vertical**, so the frame's horizontal reach
 * is `fov` scaled by the aspect — and the arch is 0.53:1 against the harness's 0.75:1. At the
 * harness's 3.4 the visible width here is around a metre, which crops a dancing character at the
 * elbows. 4.2 gives roughly 1.3m across and 2.4m up, so a 1.8m figure sits inside the dome with air
 * above its head and its arms in frame.
 */
const CAMERA = { fov: 32, position: [0, 1, 4.2] } as const;

/** Chest height on these characters, and the point both the camera and the orbit pivot on. */
const TARGET = [0, 0.95, 0] as const;

/**
 * Points the camera at the character.
 *
 * R3F's default camera looks at the world origin, which on a standing figure is the floor between
 * its feet — the character then sits above the frame and the ground plane runs through the middle
 * of it. `OrbitControls` hides that by calling `lookAt(target)` on every update, so the bug is
 * invisible on the player page and obvious everywhere else: measured on the reduced-motion story,
 * which has no controls, the horizon landed halfway up the arch and the figure was cropped at the
 * waist.
 *
 * Rendered only when there are no controls. With them the camera's orientation belongs to
 * `OrbitControls`, and a layout effect re-running on a resize would snap a reader's drag back.
 */
const CameraTarget = () => {
  const camera = useThree((state) => state.camera);

  useLayoutEffect(() => {
    camera.lookAt(TARGET[0], TARGET[1], TARGET[2]);
  }, [camera]);

  return null;
};

/**
 * The device-pixel-ratio cap.
 *
 * `[1, 2]` — never below 1, never above 2, whatever the display reports. A modern phone reports 3
 * and renders nine times the pixels of a logical one; the brief asks for exactly this cap, and the
 * difference between 2× and 3× on a 200pt-wide arch is not visible while the cost is not subtle.
 */
const DPR: [number, number] = [1, 2];

export interface ModelSceneProps {
  src: string;
  clips?: ModelClipNames | null;
  restClip: ModelClipRole;
  /** `false` under reduced motion — the model is posed and the frame loop goes on demand. */
  animate: boolean;
  /** Gentle auto-orbit plus limited drag. The player page only. */
  orbit: boolean;
  hoverSignal: number;
  environmentPreset: ModelEnvironmentPreset;
  /** The clip now playing, whenever that changes. Its first call also means the model is mounted. */
  onClip?: (clip?: string) => void;
  /** The canvas or the model failed outright — the shell drops to the fallback image. */
  onError?: () => void;
}

/**
 * The WebGL half of `ModelViewer`, in its own module so `next/dynamic` has a chunk boundary to cut
 * on. Nothing above this file imports `three`, `@react-three/fiber` or `@react-three/drei`.
 */
const ModelScene = (props: ModelSceneProps) => {
  const { src, clips, restClip, animate, orbit, hoverSignal, environmentPreset, onClip, onError } = props;

  return (
    <ModelBoundary label="canvas" onError={onError}>
      <Canvas
        camera={CAMERA}
        dpr={DPR}
        /*
         * `demand` under reduced motion: the scene is drawn when something asks for it —
         * `ModelCharacter` after it poses the skeleton, drei's controls on a drag — and never on a
         * timer. `always` would hold a `requestAnimationFrame` loop open to redraw an identical
         * frame sixty times a second, which is a battery cost with no picture to show for it, and
         * precisely the sort of thing the reader turned motion down to avoid.
         */
        frameloop={animate ? 'always' : 'demand'}
        gl={{
          /*
           * Khronos PBR Neutral, and this is a project decision rather than a preference.
           *
           * R3F defaults to `ACESFilmicToneMapping`, which pushes skin warm and desaturates these
           * models badly — settled empirically in the model harness against Meshy's own render.
           * `NoToneMapping` is worse again: it clips everything above 1.0 to white, which is what a
           * plain GLB previewer does and what "washed out" actually looks like.
           */
          toneMapping: NeutralToneMapping,
          toneMappingExposure: 1
        }}
        /*
         * No real-time shadows, per the brief — the contact shadow below is a single ground pass
         * rather than a shadow map, and a shadow-casting light would add a depth render per frame
         * for a character that is already grounded.
         */
        shadows={false}
      >
        <ModelLighting preset={environmentPreset} />

        {/*
         * The character's own suspense boundary. `fallback={null}` rather than a placeholder mesh:
         * the shell is already painting the arch placeholder underneath this canvas, in the DOM,
         * where it costs nothing and is visible before any WebGL context exists at all.
         */}
        <Suspense fallback={null}>
          <ModelCharacter
            animate={animate}
            clips={clips}
            hoverSignal={hoverSignal}
            onClip={onClip}
            restClip={restClip}
            src={src}
          />
        </Suspense>

        {/*
         * Seats the character on the ground. `frames={1}` when nothing moves — the pose is fixed,
         * so re-rendering the shadow's depth pass every frame would draw the same texture forever.
         */}
        <ContactShadows
          blur={2.6}
          far={1.2}
          frames={animate ? Number.POSITIVE_INFINITY : 1}
          opacity={0.32}
          position={[0, 0, 0]}
          resolution={512}
          scale={4}
        />

        {orbit ? null : <CameraTarget />}

        {orbit ? (
          <OrbitControls
            /*
             * The "gentle orbit" is the auto-rotation, not the dragging — a reader who never
             * touches it still sees the character turn. Off under reduced motion, where an
             * unprompted camera move is the thing being asked about.
             */
            autoRotate={animate}
            autoRotateSpeed={0.45}
            enableDamping
            // No pan and no zoom, per the brief: the framing is a design decision, and both of
            // those let a reader lose the character off-screen with no way back.
            enablePan={false}
            enableZoom={false}
            /*
             * The vertical limit. Roughly 72°–101° from straight up, so the camera stays around eye
             * level: far enough to feel free, not far enough to look up the character's chin or
             * down on the top of its head, and never below the ground plane the contact shadow is
             * drawn on.
             */
            maxPolarAngle={Math.PI * 0.56}
            minPolarAngle={Math.PI * 0.4}
            target={TARGET}
          />
        ) : null}
      </Canvas>
    </ModelBoundary>
  );
};

/**
 * Start the GLB download without mounting anything.
 *
 * Re-exported from `ModelCharacter` so `preload.ts` has one entry point into this chunk, and so the
 * `useGLTF` cache key (`src` plus `useDraco: false`) is written in exactly one place — preloading
 * under different loader options silently fills a different cache entry and buys nothing.
 */
export const preloadModelScene = (src: string) => {
  preloadCharacter(src);
};

export default ModelScene;
