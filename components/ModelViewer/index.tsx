'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';

import Image from '@/components/Image';
import classNames from '@/helpers/classNames';
import type { ModelClipNames, ModelClipRole } from '@/helpers/modelClips';

import type { ModelEnvironmentPreset } from './ModelLighting';
import { preloadModel } from './preload';
import useModelCapability, { hasRenderer } from './useModelCapability';
import type { ModelCapability } from './useModelCapability';

import styles from './styles.module.scss';

/**
 * The 3D half, behind a chunk boundary.
 *
 * `ssr: false` because there is no server-side WebGL context to render into, and because the point
 * of the split is that **text and navigation reach the reader before any of this does**. Nothing
 * above this line imports `three`; the shell, its stylesheet and the placeholder are a few hundred
 * bytes and render on the server.
 *
 * `loading` is `null` rather than a spinner: the shell already paints the arch placeholder *behind*
 * the canvas, in the DOM, so there is nothing for this to add and a second placeholder would
 * cross-fade against the first.
 *
 * There are two suspense boundaries here and it is worth saying where, because neither is written
 * at this call site. `next/dynamic` builds on `React.lazy` and renders its own `<Suspense>` with
 * `loading` as the fallback, which covers the *chunk*; `ModelScene` then puts a second one inside
 * the canvas around the model loader, which covers the *GLB*. Adding a third around this element
 * would be inert — `next/dynamic` never suspends past its own boundary.
 */
const ModelScene = dynamic(() => import('./ModelScene'), { loading: () => null, ssr: false });

/**
 * What the viewer should render, when the caller wants to say rather than let it decide.
 *
 *   auto      detect. The default, and what every page should use.
 *   animated  the canvas with clips playing.
 *   static    the canvas, posed at the first frame and never advanced — the reduced-motion render.
 *   fallback  the fallback image — the no-WebGL, slow-device and failed-load render.
 *
 * **A forced mode overrides policy, never capability.** `animated` and `static` on a browser with
 * no WebGL at all still resolve to `fallback`, because the alternative is a forced mode that can
 * hard-crash a page. What a force *does* override is the judgement calls — reduced motion, a
 * software rasteriser, Data Saver — which is what makes each branch reachable from a story and from
 * a page that has a reason to differ (a print view, a Studio preview, a decorative use where the
 * motion carries no meaning).
 */
export type ModelViewerMode = 'auto' | 'animated' | 'static' | 'fallback';

/** What is actually on screen inside the arch. Mirrored onto `data-model-render`. */
type ModelRender = 'placeholder' | 'canvas' | 'image';

export interface ModelViewerProps {
  className?: string;
  /**
   * The canvas's text alternative, and the accessible name of whatever is in the arch — the model,
   * the fallback image or the placeholder.
   *
   * Required, with no default. A default would have to be derived from the file name or invented,
   * and a plausible-but-wrong alternative is worse than an obviously missing one: this is the only
   * description a reader who cannot see the character will ever get.
   */
  alt: string;
  /** The GLB. A Sanity file asset URL in production; optional, because `player.model` is optional. */
  src?: string;
  /** The authored clip names. Every one may be absent or name a clip the file does not contain. */
  clips?: ModelClipNames | null;
  /**
   * Which clip loops when nothing is happening — `idle` on the select screen, `feature` on a player
   * page. The one prop that distinguishes the two uses, which is why there is one component and not
   * two.
   */
  restClip?: Exclude<ModelClipRole, 'hover'>;
  /**
   * Play the hover clip once on pointer enter or tap, then crossfade back to rest.
   *
   * Pointer-only, and deliberately so: the motion is decorative flourish that carries no
   * information, and the control a keyboard reader actually needs — the link the card wraps — is
   * owned by the caller. Nothing is lost by not reaching it. If that ever stops being true the clip
   * has become content, and it needs a described trigger rather than a hover.
   */
  interactive?: boolean;
  /** Gentle auto-orbit plus limited drag. The player page only. */
  orbit?: boolean;
  /** Shown whenever the 3D is unavailable. `player.fallbackImage`. */
  fallbackImage?: SanityImageSimple | null;
  /** Override the automatic decision. See `ModelViewerMode`. */
  mode?: ModelViewerMode;
  /** drei's HDRI preset. `studio` is what the model harness settled on against the real characters. */
  environmentPreset?: ModelEnvironmentPreset;
  /**
   * The panel chrome from the comp — the corner label (node 1:166), the chip over the stage (1:164)
   * and the bottom-right readout (1:167).
   *
   * All three are opt-in and render nothing when absent. The comp prints "3D CANVAS (REACT THREE
   * FIBER) · DANCE LOOP", "sam-dance.glb" and "BPM 118", and MAM-1901 flags them as "confirm
   * whether they ship" — that is the player route's decision, not this component's, so the chrome
   * is built as an option rather than baked in.
   */
  label?: string;
  badge?: string;
  readout?: string;
}

const DEFAULT_PRESET: ModelEnvironmentPreset = 'studio';

/**
 * The shared 3D character — the select screen's two cards and the player page's stage.
 *
 * ## What renders, and when
 *
 * One arch, one of three things inside it, and exactly one accessible name across all three:
 *
 * | `data-model-render` | inside the arch      | reached by                                          |
 * | ------------------- | -------------------- | --------------------------------------------------- |
 * | `placeholder`       | the hatched arch     | server render, first hydrating render, no GLB, and   |
 * |                     |                      | *behind* the canvas until the model reports ready    |
 * | `canvas`            | the WebGL scene      | a capable browser                                    |
 * | `image`             | `fallbackImage`      | no WebGL, a software rasteriser, Data Saver, a load  |
 * |                     |                      | failure — or no GLB authored yet                     |
 *
 * The placeholder is not a fourth state layered on top of the others: it is a DOM element that is
 * always in the arch, behind everything, and it is *named* only when it is the thing on show. That
 * is what keeps `getByRole('img', { name })` returning exactly one node in every branch, and it is
 * why page content is never blocked — the arch has its size and its surface before a single byte of
 * `three` has been fetched.
 *
 * ## Three fallbacks, three detectors
 *
 * - **reduced motion** — `(prefers-reduced-motion: reduce)`, live-subscribed, resolves to `static`:
 *   the canvas mounts, the rest clip is posed at frame 0, the mixer never advances and the frame
 *   loop goes on demand. See `useModelCapability`.
 * - **no WebGL or a very slow device** — no context, or a context whose unmasked renderer is a CPU
 *   rasteriser, or Data Saver, or ≤1GB of memory. Resolves to `fallback`.
 * - **loading** — everything before the scene chunk and the GLB have both arrived, which is where
 *   every render starts. The placeholder holds the space.
 *
 * A fourth is implied rather than asked for: a GLB that 404s or will not parse throws inside the
 * canvas, R3F re-throws it in the outer tree, `ModelBoundary` catches it and the viewer drops to
 * the same fallback image.
 */
const ModelViewer = (props: ModelViewerProps) => {
  const {
    alt,
    badge,
    className,
    clips,
    environmentPreset = DEFAULT_PRESET,
    fallbackImage,
    interactive = false,
    label,
    mode = 'auto',
    orbit = false,
    readout,
    restClip = 'idle',
    src
  } = props;

  const capability = useModelCapability();

  /**
   * Everything the scene reports back, in one object keyed by the `src` it belongs to.
   *
   * One object rather than three `useState`s because the three always change together and always
   * belong to a particular model — and because keeping `src` beside them is what makes the reset
   * below correct.
   */
  const [model, setModel] = useState(() => ({ src, loaded: false, clip: null as string | null, failed: false }));
  const [hoverSignal, setHoverSignal] = useState(0);

  /*
   * A new model starts over — **during render, not in an effect**, and the difference is a real bug
   * rather than a style preference.
   *
   * Child effects run before parent effects. The reset was a `useEffect` on `[src]`, which is fine
   * while the new GLB has to be fetched (the reset lands long before the model resolves) and wrong
   * the moment it does not: a `src` that is already in the `useGLTF` cache — which is exactly what
   * `preloadModel` is for — resolves in the same commit, so `onClip` fired from the child's effect,
   * set `loaded`, and then the parent's reset effect immediately cleared it again. The viewer then
   * sat at `loaded: false` with a fully rendered character behind the placeholder until the next
   * clip change happened to set it.
   *
   * Adjusting state during render is React's documented answer to exactly this, and it is cheap:
   * React re-runs *this* component before rendering its children, so the scene below never sees the
   * previous model's state at all. The condition is false immediately afterwards, so it cannot loop.
   */
  if (model.src !== src) {
    setModel({ src, loaded: false, clip: null, failed: false });
  }

  /*
   * Stable across renders, because `ModelCharacter` lists `onClip` among the dependencies of the
   * effect that starts the rest clip. An inline arrow would be a new function on every parent
   * render, which would stop and restart the animation each time — a visible hitch with no cause
   * anywhere near it. There is no React Compiler in this project (`next.config.js` does not enable
   * it), so this cannot be left to be memoised automatically.
   *
   * The first call is also "the model is in the scene": nothing can be playing before it exists.
   */
  const handleClip = useCallback((name?: string) => {
    setModel((current) => ({ ...current, clip: name ?? null, loaded: true }));
  }, []);

  const handleError = useCallback(() => setModel((current) => ({ ...current, failed: true })), []);

  const resolved: ModelCapability = (() => {
    /*
     * `pending` covers both the server render and the first client render of a hydrating tree, and
     * it has to come first. Falling through to a real decision here would render one branch on the
     * server and a different one on hydration, which React reports as a mismatch and repairs by
     * throwing the server markup away.
     */
    if (capability === 'pending') {
      return 'pending';
    }
    if (model.failed || !src) {
      return 'fallback';
    }
    if (mode === 'auto') {
      return capability;
    }
    if (mode === 'fallback') {
      return 'fallback';
    }
    // Policy overridden, capability not. See `ModelViewerMode`.
    return hasRenderer() ? mode : 'fallback';
  })();

  const hasFallbackImage = Boolean(fallbackImage?.asset?.url);

  const render: ModelRender = (() => {
    if (resolved === 'animated' || resolved === 'static') {
      return 'canvas';
    }
    // `Image` returns null when the asset has no URL, which would leave the arch with no accessible
    // name at all. The placeholder is the honest render for a fallback that is not there either.
    return resolved === 'fallback' && hasFallbackImage ? 'image' : 'placeholder';
  })();

  /*
   * Start the GLB download as soon as it is known to be needed, in parallel with the scene chunk
   * rather than after it. `useGLTF` caches by URL, so the mount below reuses this download.
   */
  useEffect(() => {
    if (render === 'canvas') {
      preloadModel(src);
    }
  }, [render, src]);

  const canHover = interactive && resolved === 'animated' && Boolean(clips?.hover);
  const triggerHover = () => setHoverSignal((signal) => signal + 1);

  const placeholderIsContent = render === 'placeholder';

  /*
   * The arch is holding its final content, and the loading placeholder should be gone.
   *
   * Not the same question as `data-model-loaded`, which stays canvas-only because it reports
   * whether *the model* is in the scene. The fallback image is a settled render too — it is what
   * this browser is going to show — so leaving the hatch pulsing behind the letterbox of a
   * `contain`-fitted picture would say "still working" about something that had finished.
   */
  const settled = model.loaded || render === 'image';

  return (
    <div
      className={classNames(styles.viewer, className)}
      data-model-clip={model.clip ?? undefined}
      data-model-loaded={render === 'canvas' ? String(model.loaded) : undefined}
      data-model-mode={resolved}
      data-model-render={render}
    >
      {label ? <span className={styles.label}>{label}</span> : null}

      <div
        className={classNames(styles.stage, { [styles.settled]: settled })}
        onPointerDown={canHover ? triggerHover : undefined}
        onPointerEnter={canHover ? triggerHover : undefined}
      >
        {/*
         * Always present, behind everything. Named only when it is the thing on show — otherwise
         * the canvas holder or the `<img>` owns the name, and two names in one arch would be read
         * out twice.
         */}
        <span
          aria-hidden={placeholderIsContent ? undefined : true}
          aria-label={placeholderIsContent ? alt : undefined}
          className={styles.placeholder}
          role={placeholderIsContent ? 'img' : undefined}
        />

        {render === 'canvas' && src ? (
          /*
           * `role="img"` on the holder rather than on the `<canvas>` R3F creates, because R3F owns
           * that element and gives no way to put attributes on it. A container with `role="img"`
           * exposes its subtree as one image with one name, which is exactly the right shape: the
           * canvas has no accessible content of its own to lose.
           */
          <div aria-label={alt} className={styles.canvasHolder} role="img">
            <ModelScene
              animate={resolved === 'animated'}
              clips={clips}
              environmentPreset={environmentPreset}
              hoverSignal={hoverSignal}
              onClip={handleClip}
              onError={handleError}
              orbit={orbit}
              restClip={restClip}
              src={src}
            />
          </div>
        ) : null}

        {render === 'image' && fallbackImage ? (
          <Image
            {...fallbackImage}
            // The arch owns the description, so the `<img>` carries it and nothing else does.
            altText={alt}
            className={styles.image}
            /*
             * `contain`, not `cover`, and for parity rather than taste: the canvas above draws the
             * whole character inside the arch with the surface showing around it, and a fallback is
             * only a fallback if it stands in for what it replaces. `cover` on a 0.53:1 arch crops a
             * portrait render at the head or the feet — the two parts of a character that cannot be
             * lost — and does it differently at every panel width.
             */
            objectFit="contain"
            sizes="(max-width: 768px) 60vw, 30vw"
          />
        ) : null}

        {badge ? <span className={styles.badge}>{badge}</span> : null}
      </div>

      {readout ? <span className={styles.readout}>{readout}</span> : null}
    </div>
  );
};

export { preloadModel };
export default ModelViewer;
