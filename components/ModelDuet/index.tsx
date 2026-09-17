'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';

import Image from '@/components/Image';
import type { ModelViewerMode } from '@/components/ModelViewer';
import type { ModelEnvironmentPreset } from '@/components/ModelViewer/ModelLighting';
import useModelCapability, { hasRenderer, prefersReducedMotion } from '@/components/ModelViewer/useModelCapability';
import type { ModelCapability } from '@/components/ModelViewer/useModelCapability';
import classNames from '@/helpers/classNames';
import { DUET_BACK, DUET_FRONT } from '@/helpers/duetPlacement';
import type { DuetPlacement } from '@/helpers/duetPlacement';

import { preloadDuet } from './preload';

import styles from './styles.module.scss';

/**
 * The 3D half, behind a chunk boundary.
 *
 * `ssr: false` because there is no server-side WebGL context to render into, and because the point
 * of the split is that the page's words reach the reader before eight megabytes of character does.
 * Nothing above this line imports `three`; the shell, its stylesheet and the placeholder are a few
 * hundred bytes and render on the server.
 *
 * `loading` is `null` rather than a spinner: the shell already paints the stage placeholder *behind*
 * the canvas, in the DOM, so there is nothing for this to add.
 */
const ModelDuetScene = dynamic(() => import('./ModelDuetScene'), { loading: () => null, ssr: false });

/**
 * Back to front, and the order is the API rather than an implementation detail.
 *
 * Nothing depends on it for correctness — the depth buffer sorts the two characters however they
 * are listed — but a reader of this file should be able to see which of them is upstage without
 * going to `duetPlacement.ts` for the Z coordinate.
 */
const DEFAULT_CHARACTERS: DuetPlacement[] = [DUET_BACK, DUET_FRONT];

/** What is actually on screen inside the stage. Mirrored onto `data-model-render`. */
type DuetRender = 'placeholder' | 'canvas' | 'image';

const DEFAULT_PRESET: ModelEnvironmentPreset = 'studio';

export interface ModelDuetProps {
  className?: string;
  /**
   * The scene's text alternative, and the accessible name of whatever is in the stage — the
   * characters, the fallback image or the placeholder.
   *
   * Required, with no default. This is the only description a reader who cannot see the scene will
   * ever get, and the two people in it are the entire content of the page it sits on.
   */
  alt: string;
  /** Who is in the scene, and where. Defaults to the measured pair; see `@/helpers/duetPlacement`. */
  characters?: DuetPlacement[];
  /** Override the automatic decision. Shares `ModelViewer`'s semantics exactly. */
  mode?: ModelViewerMode;
  /** drei's HDRI preset. `studio` is what the model harness settled on against these characters. */
  environmentPreset?: ModelEnvironmentPreset;
  /** Shown whenever the 3D is unavailable. */
  fallbackImage?: SanityImageSimple | null;
  /**
   * Load the fallback image eagerly, at high fetch priority.
   *
   * The one LCP lever this component has. Neither the canvas nor the placeholder is an LCP
   * candidate, so in those branches this contributes nothing; the fallback `<img>` is the
   * exception, and it is chosen for precisely the devices least able to absorb a lazy load.
   */
  priority?: boolean;
}

/**
 * Lauren and Sam, dancing, in one scene.
 *
 * ## What renders, and when
 *
 * One stage, one of three things inside it, and exactly one accessible name across all three:
 *
 * | `data-model-render` | inside the stage    | reached by                                          |
 * | ------------------- | ------------------- | --------------------------------------------------- |
 * | `placeholder`       | the hatched stage   | server render, first hydrating render, and *behind*  |
 * |                     |                     | the canvas until **both** characters report ready    |
 * | `canvas`            | the WebGL scene     | a capable browser                                    |
 * | `image`             | `fallbackImage`     | no WebGL, a software rasteriser, Data Saver, a load  |
 * |                     |                     | failure                                              |
 *
 * The placeholder is not a fourth state layered on the others: it is a DOM element that is always
 * in the stage, behind everything, and it is *named* only when it is the thing on show. That is
 * what keeps `getByRole('img', { name })` returning exactly one node in every branch.
 *
 * ## Why this is not `ModelViewer` with two `src`s
 *
 * `ModelViewer` is a character in an arch — a 0.53:1 portrait frame, its camera at 4.2, an
 * optional orbit and a hover one-shot, and a `clips` object authored per player document in the
 * CMS. Every one of those is wrong here: the frame is near-square because the subject is two people
 * side by side, the camera is further back because one of the clips jumps to 2.23m, there is
 * nothing to interact with, and the clips are fixed properties of *this scene* rather than content.
 *
 * What the two genuinely share is the machinery below the scene, and that is imported rather than
 * copied: `useModelCapability`, `ModelBoundary`, `ModelLighting` and `ModelCharacter` are all
 * `ModelViewer`'s. The only change any of them needed was `position` and `rotationY` on
 * `ModelCharacter`, which are additive and default to standing at the origin facing front.
 *
 * ## The cost, stated plainly
 *
 * Two GLBs, about 8MB decompressed over the wire, two skinned meshes and two skeletons on one
 * canvas. `useModelCapability` already refuses all of that on a device reporting ≤1GB of memory, a
 * software rasteriser or Data Saver, and drops to `fallbackImage` — which is why giving this
 * component a fallback image matters more than it does on a player card, where the arch is one of
 * several things on the page. See `preloadDuet` for the one call that materially improves the wait.
 */
const ModelDuet = (props: ModelDuetProps) => {
  const {
    alt,
    characters = DEFAULT_CHARACTERS,
    className,
    environmentPreset = DEFAULT_PRESET,
    fallbackImage,
    mode = 'auto',
    priority = false
  } = props;

  const capability = useModelCapability();

  /**
   * Which characters have landed in the scene, and whether anything threw.
   *
   * A list of `src` rather than a count, because `ModelCharacter`'s `onClip` is not a one-shot: it
   * fires again whenever the rest effect re-runs, which includes StrictMode's double-invocation.
   * Counting would reach two with one character in the scene and clear the placeholder over an
   * empty stage. `signature` is kept alongside for the same reason `ModelViewer` keeps `src`
   * beside its own state — it is what makes the reset below correct.
   */
  const signature = characters.map((character) => character.src).join('|');
  const [scene, setScene] = useState(() => ({ failed: false, ready: [] as string[], signature }));

  /*
   * A new cast starts over — **during render, not in an effect**, which is the pattern
   * `ModelViewer` documents at length and for the same reason. Child effects run before parent
   * effects, so a `useEffect` reset lands *after* an already-cached GLB has reported ready, and the
   * scene sits at `ready: []` with two fully rendered characters hidden behind the placeholder.
   *
   * React re-runs this component before rendering its children, so the scene below never sees the
   * previous cast's state. The condition is false immediately afterwards, so it cannot loop.
   */
  if (scene.signature !== signature) {
    setScene({ failed: false, ready: [], signature });
  }

  /*
   * Stable across renders. `ModelDuetScene` passes this down to each `DuetCharacter`, which lists
   * it among the dependencies of its own `useCallback` — and that one reaches `ModelCharacter`'s
   * rest-clip effect, which would stop and restart the dance on every parent render if the identity
   * changed. There is no React Compiler in this project, so this cannot be left to be memoised.
   */
  const handleCharacterReady = useCallback((src: string) => {
    setScene((current) => (current.ready.includes(src) ? current : { ...current, ready: [...current.ready, src] }));
  }, []);

  const handleError = useCallback(() => setScene((current) => ({ ...current, failed: true })), []);

  const resolved: ModelCapability = (() => {
    /*
     * `pending` covers both the server render and the first client render of a hydrating tree, and
     * it has to come first. Falling through to a real decision here would render one branch on the
     * server and another on hydration, which React repairs by throwing the server markup away.
     */
    if (capability === 'pending') {
      return 'pending';
    }
    if (scene.failed || characters.length === 0) {
      return 'fallback';
    }
    if (mode === 'auto') {
      return capability;
    }
    if (mode === 'fallback') {
      return 'fallback';
    }
    // Capability is not overridable: no context at all still means the fallback image.
    if (!hasRenderer()) {
      return 'fallback';
    }
    /*
     * Nor is the reader's stated preference. A forced `animated` still yields the posed, silent
     * render on a machine asking for reduced motion — which matters more here than on a player
     * card, because this is two looping dances with no in-page way to stop them (WCAG 2.2.2).
     */
    if (mode === 'animated' && prefersReducedMotion()) {
      return 'static';
    }
    return mode;
  })();

  const hasFallbackImage = Boolean(fallbackImage?.asset?.url);

  const render: DuetRender = (() => {
    if (resolved === 'animated' || resolved === 'static') {
      return 'canvas';
    }
    // `Image` returns null when the asset has no URL, which would leave the stage with no
    // accessible name at all. The placeholder is the honest render for a fallback that is not there.
    return resolved === 'fallback' && hasFallbackImage ? 'image' : 'placeholder';
  })();

  /*
   * Warm both GLB caches as soon as a canvas is known to be needed.
   *
   * Not a parallel download — `preloadDuet` reaches the loader through `import('./ModelDuetScene')`,
   * so the files cannot be requested until the chunk carrying `three` has downloaded and evaluated.
   * What it buys is that `<ModelDuetScene>` mounts in this same commit and fires the same dynamic
   * import, so this mostly leads the real load by a microtask while not being conditional on React
   * committing the canvas subtree, which a transition or a suspended reveal can defer.
   *
   * The call worth making is the one on the *previous* page. See `preloadDuet`.
   */
  useEffect(() => {
    /*
     * Keyed on `signature`, not on `characters`.
     *
     * An inline `characters` array is a new identity on every render, so depending on it would
     * re-fire this preload continuously. `signature` is derived from exactly the `src` values this
     * reads, so it changes if and only if the thing being preloaded changes.
     *
     * Deliberately **not** marked with an `eslint-disable` for `react-hooks/exhaustive-deps`.
     * `.oxlintrc.json` enables no React plugin at all and oxlint ships no React Compiler rules, so
     * such a comment would suppress nothing and would imply a gate that does not exist. Splitting
     * the sources out with `useMemo` would satisfy a linter that is not running here at the cost of
     * an indirection; the dependency is correct, and this note is the review record for it.
     */
    if (render === 'canvas') {
      preloadDuet(signature.split('|').filter(Boolean));
    }
  }, [render, signature]);

  /**
   * Both of them, or neither.
   *
   * `>=` rather than `===` so a duplicated `src` in `characters` — which `ready` deduplicates and a
   * length comparison would therefore never satisfy — degrades to "ready as soon as the distinct
   * models are in" instead of leaving the placeholder up forever.
   */
  const loaded = characters.length > 0 && scene.ready.length >= new Set(characters.map((c) => c.src)).size;

  /*
   * Three states, not two — the distinction `ModelViewer` documents, and it applies identically.
   *
   * `loading`  something is genuinely on its way: the capability decision, or a model.
   * `settled`  the stage holds its final content, so the placeholder fades out entirely.
   * neither    the placeholder **is** the final render — no WebGL and no fallback image to offer.
   *            The hatch stays, because it is the stage's empty ground rather than a spinner, and
   *            the breathe stops. An animation that says "still working" about something that has
   *            finished, forever, with no pause or stop, fails WCAG 2.2.2 outright.
   */
  const loading = resolved === 'pending' || (render === 'canvas' && !loaded);
  const settled = render === 'image' || (render === 'canvas' && loaded);

  const placeholderIsContent = render === 'placeholder';

  return (
    <div
      className={classNames(styles.duet, className)}
      data-model-loaded={render === 'canvas' ? String(loaded) : undefined}
      data-model-mode={resolved}
      data-model-render={render}
    >
      <div className={classNames(styles.stage, { [styles.resting]: !loading, [styles.settled]: settled })}>
        {/*
         * Always present, behind everything. Named only when it is the thing on show — otherwise
         * the canvas holder or the `<img>` owns the name, and two names in one stage would be read
         * out twice.
         */}
        <span
          aria-hidden={placeholderIsContent ? undefined : true}
          aria-label={placeholderIsContent ? alt : undefined}
          className={styles.placeholder}
          role={placeholderIsContent ? 'img' : undefined}
        />

        {render === 'canvas' ? (
          /*
           * `role="img"` on the holder rather than on the `<canvas>` R3F creates, because R3F owns
           * that element and gives no way to put attributes on it. A container with `role="img"`
           * exposes its subtree as one image with one name, which is the right shape: the canvas
           * has no accessible content of its own to lose.
           */
          <div aria-label={alt} className={styles.canvasHolder} role="img">
            <ModelDuetScene
              animate={resolved === 'animated'}
              characters={characters}
              environmentPreset={environmentPreset}
              onCharacterReady={handleCharacterReady}
              onError={handleError}
            />
          </div>
        ) : null}

        {render === 'image' && fallbackImage ? (
          <Image
            {...fallbackImage}
            // The stage owns the description, so the `<img>` carries it and nothing else does.
            altText={alt}
            className={styles.image}
            /*
             * `contain`, not `cover`, and for parity rather than taste: the canvas draws both
             * characters whole inside the stage, and a fallback is only a fallback if it stands in
             * for what it replaces. `cover` crops a near-square render at the heads or the feet.
             */
            objectFit="contain"
            priority={priority}
            sizes="(max-width: 768px) 92vw, 60vw"
          />
        ) : null}
      </div>
    </div>
  );
};

export { preloadDuet };
export default ModelDuet;
