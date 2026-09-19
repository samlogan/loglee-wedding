'use client';

import { ContactShadows, OrbitControls } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense, useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { NeutralToneMapping } from 'three';
import type { PerspectiveCamera } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

import type { ModelClipNames, ModelRestRole } from '@/helpers/modelClips';

import { MODEL_BLEED } from './bleed';
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
 *
 * Reviewed against the comp and kept. The comp cannot arbitrate it directly — nodes 1:163 and
 * 1:278 draw the arch as an empty hatched placeholder, so there is no drawn framing to match — so
 * it was judged on what the arch can hold: measured on the feature clip at a 520px panel, the
 * figure spans 78% of the arch's height and 55% of its width at full arm extension, with the raised
 * hand inside the dome and the feet on the stage. The arithmetic and the picture agree.
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
 * Keeps the arch's framing on a canvas larger than the arch.
 *
 * The canvas reaches past the arch by `MODEL_BLEED`, so a raised hand can leave the dome. If the
 * camera simply filled that larger canvas, the character would grow with it and drift upwards. So the
 * camera keeps the arch's own frustum: its `aspect` is the arch's, and `setViewOffset` widens what is
 * drawn by the same margins the CSS adds — `top` of the arch's height above it, `inline` of its width
 * either side. Measured in pixels, the character stands exactly where it did when the canvas was the
 * arch; the bleed is only extra room around it.
 *
 * `manual` stops R3F resetting `aspect` to the canvas's on every resize (`updateCamera` returns early
 * for a manual camera), which is why this re-applies on every size change itself. `invalidate` redraws
 * under `frameloop="demand"`, where nothing else would notice the projection changed.
 */
const CameraFrame = () => {
  // `manual` is R3F's flag on its own `Camera` type, not three's; see `updateCamera` in the note above.
  const camera = useThree((state) => state.camera) as PerspectiveCamera & { manual?: boolean };
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  const invalidate = useThree((state) => state.invalidate);

  useLayoutEffect(() => {
    if (!(camera.isPerspectiveCamera && width && height)) {
      return;
    }
    const archWidth = width / (1 + 2 * MODEL_BLEED.inline);
    const archHeight = height / (1 + MODEL_BLEED.top);
    camera.manual = true;
    camera.aspect = archWidth / archHeight;
    camera.setViewOffset(
      archWidth,
      archHeight,
      -MODEL_BLEED.inline * archWidth,
      -MODEL_BLEED.top * archHeight,
      width,
      height
    );
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, height, invalidate, width]);

  return null;
};

/**
 * How far either side of straight-on the orbit may carry the camera: 25°.
 *
 * The client does not want the camera to show the characters' backs. The orbit used to auto-rotate
 * through the full circle, so every character showed its back once every couple of minutes. It now
 * sways between these limits, and a drag is held to them too. A clip that spins the character still
 * turns its back for a moment, and that is fine: it is the choreography, not the camera.
 */
const ORBIT_SWAY = (25 * Math.PI) / 180;

/** How close to a limit counts as having reached it. The controls clamp at the limit exactly. */
const SWAY_EDGE = 0.005;

/**
 * Turns the auto-rotation round at each end of the sway.
 *
 * `OrbitControls` clamps the camera to `minAzimuthAngle`/`maxAzimuthAngle` but keeps pushing against
 * the limit, so on its own the auto-rotation would stop dead at one end. Flipping the sign of
 * `autoRotateSpeed` there makes it swing back. A positive speed decreases the azimuth (three's
 * `rotateLeft`), hence the sign at each end. The magnitude is left as the controls were given it.
 */
const OrbitSway = ({ controls }: { controls: RefObject<OrbitControlsImpl | null> }) => {
  useFrame(() => {
    const current = controls.current;
    if (!current?.autoRotate) {
      return;
    }
    const azimuth = current.getAzimuthalAngle();
    const speed = Math.abs(current.autoRotateSpeed);
    if (azimuth <= -ORBIT_SWAY + SWAY_EDGE) {
      current.autoRotateSpeed = -speed;
    } else if (azimuth >= ORBIT_SWAY - SWAY_EDGE) {
      current.autoRotateSpeed = speed;
    }
  });

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

/**
 * The renderer options.
 *
 * Khronos PBR Neutral, and this is a project decision rather than a preference. R3F defaults to
 * `ACESFilmicToneMapping`, which pushes skin warm and desaturates these models badly — settled
 * empirically in the model harness against Meshy's own render. `NoToneMapping` is worse again: it
 * clips everything above 1.0 to white, which is what a plain GLB previewer does and what "washed
 * out" actually looks like.
 *
 * Hoisted for the same reason as `CAMERA` and `DPR` above. R3F shallow-compares this object against
 * the live renderer before re-applying it, so an inline literal was not a re-render hazard — but
 * this file states its canvas configuration as module constants and there is no reason for one
 * exception.
 */
const GL = { toneMapping: NeutralToneMapping, toneMappingExposure: 1 } as const;

export interface ModelSceneProps {
  src: string;
  clips?: ModelClipNames | null;
  restClip: ModelRestRole;
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
  /**
   * The arch, which receives the canvas's pointer events.
   *
   * The canvas reaches past the arch (see `CameraFrame`), and it must not capture the pointer over
   * that margin: on the select screen the margin crosses the gap into the neighbouring card, and on the
   * player page it can sit over the content above the panel. With an `eventSource`, R3F sets its own
   * container to `pointer-events: none` and listens on this element instead, and drei's `OrbitControls`
   * binds to it too, so a drag starts on the arch and nowhere else.
   */
  eventSource?: RefObject<HTMLElement | null>;
}

/**
 * The WebGL half of `ModelViewer`, in its own module so `next/dynamic` has a chunk boundary to cut
 * on. Nothing above this file imports `three`, `@react-three/fiber` or `@react-three/drei`.
 */
const ModelScene = (props: ModelSceneProps) => {
  const { src, clips, restClip, animate, orbit, hoverSignal, environmentPreset, onClip, onError, eventSource } = props;

  // The orbit's controls, for `OrbitSway` to turn the auto-rotation round at each end.
  const controls = useRef<OrbitControlsImpl>(null);

  return (
    <ModelBoundary label="canvas" onError={onError}>
      <Canvas
        camera={CAMERA}
        dpr={DPR}
        eventSource={eventSource as RefObject<HTMLElement> | undefined}
        /*
         * `demand` under reduced motion: the scene is drawn when something asks for it —
         * `ModelCharacter` after it poses the skeleton, drei's controls on a drag — and never on a
         * timer. `always` would hold a `requestAnimationFrame` loop open to redraw an identical
         * frame sixty times a second, which is a battery cost with no picture to show for it, and
         * precisely the sort of thing the reader turned motion down to avoid.
         */
        frameloop={animate ? 'always' : 'demand'}
        gl={GL}
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

          {/*
           * Seats the character on the ground. `frames={1}` when nothing moves — the pose is fixed,
           * so re-baking the shadow's depth pass every frame would draw the same texture forever.
           *
           * **Inside the character's suspense boundary on purpose.** drei holds `frames`' counter in
           * its render scope, so `frames={1}` means "one bake per React render", not "one ever" —
           * and under `frameloop="demand"` the first demanded frame can arrive before the GLB has
           * resolved, baking an empty scene. Mounted out here it was saved only by a chain of
           * accidents (`onClip` → `setModel` → a re-render of an unmemoised `ModelScene` → a fresh
           * counter → `ModelCharacter`'s own `invalidate()`), which anyone memoising this component
           * would have broken silently, leaving the reduced-motion render with no shadow under the
           * character. Suspended alongside the model, it simply cannot mount before there is one.
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
        </Suspense>

        <CameraFrame />

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
            // The horizontal limit: a sway either side of straight-on, never round the back.
            maxAzimuthAngle={ORBIT_SWAY}
            minAzimuthAngle={-ORBIT_SWAY}
            ref={controls}
            target={TARGET}
          />
        ) : null}

        {orbit ? <OrbitSway controls={controls} /> : null}
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
