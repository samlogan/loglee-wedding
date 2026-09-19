'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import Image from '@/components/Image';
import Tag from '@/components/Tag';
import Text from '@/components/Text';
import classNames from '@/helpers/classNames';
import type { ModelClipNames, ModelRestRole } from '@/helpers/modelClips';

import { MODEL_BLEED } from './bleed';
import type { ModelEnvironmentPreset } from './ModelLighting';
import { preloadModel } from './preload';
import useModelCapability, { hasRenderer, prefersReducedMotion } from './useModelCapability';
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
 * **A forced mode overrides the machine, never the reader.** Two things are deliberately out of a
 * caller's reach, for different reasons:
 *
 *   - **capability.** `animated` and `static` on a browser with no WebGL at all still resolve to
 *     `fallback`, because the alternative is a forced mode that can hard-crash a page.
 *   - **`prefers-reduced-motion`.** A forced `animated` on a machine asking for reduced motion
 *     resolves to `static` — the canvas still mounts, the clip does not play. This is the one
 *     signal here that is a *stated requirement* rather than a guess about the hardware, and
 *     overriding it would leave an infinitely looping character with no in-page way to stop it
 *     (WCAG 2.2.2). `static` and `fallback` are already reduced-motion-safe and pass through
 *     untouched.
 *
 * What a force *does* override is the guesses — a software rasteriser, Data Saver, a low memory
 * report — which is what makes the canvas reachable from a story (headless Chromium rasterises in
 * software) and from a page with a reason to differ.
 */
export type ModelViewerMode = 'auto' | 'animated' | 'static' | 'fallback';

/** What is actually on screen inside the arch. Mirrored onto `data-model-render`. */
type ModelRender = 'placeholder' | 'canvas' | 'image';

export interface ModelViewerProps {
  className?: string;
  /**
   * The arch behind the character — the raised fill, and the hatched arch that stands in while the
   * model loads. On by default: the player pages and the select screen are drawn around it. Off, the
   * character stands on the page itself, with no shape behind it and nothing drawn while it loads —
   * the RSVP rail. The fallback image loses the arch's rounded corners too.
   */
  backdrop?: boolean;
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
  restClip?: ModelRestRole;
  /**
   * Play the hover clip once on pointer enter or tap, then crossfade back to rest.
   *
   * Pointer-only, and deliberately so: the motion is decorative flourish that carries no
   * information, and the control a keyboard reader actually needs — the link the card wraps — is
   * owned by the caller. Nothing is lost by not reaching it. If that ever stops being true the clip
   * has become content, and it needs a described trigger rather than a hover.
   */
  interactive?: boolean;
  /**
   * Gentle auto-orbit plus limited drag. The player page only.
   *
   * Pointer-only, like `interactive`, and defensible on the same grounds — but the reasoning is
   * narrower and worth stating rather than leaving to be re-derived. The *orbit* is the part that
   * carries the view: with `animate` on it auto-rotates, so a reader who never touches it is shown
   * every angle anyway and the drag is strictly redundant. Under reduced motion the auto-rotation
   * stops and the drag becomes the only way to see another side, which is a real asymmetry — it is
   * acceptable only because a decorative character render carries no information on its far side
   * that `alt` does not already carry. If a character ever *does* (a number on a back, a detail the
   * copy refers to), this needs a keyboard path: drei's `OrbitControls` takes `keyEvents`, and the
   * holder would need `tabIndex` and a focus ring drawn as an inset `box-shadow`, since the arch
   * clips an outline.
   */
  orbit?: boolean;
  /** Shown whenever the 3D is unavailable. `player.fallbackImage`. */
  fallbackImage?: SanityImageSimple | null;
  /**
   * Load the fallback image eagerly, at high fetch priority.
   *
   * The one LCP lever this component has, and it needs a caller to pull it. Neither the canvas nor
   * the placeholder is an LCP candidate — `<canvas>` never is, and the placeholder's surface is a
   * `background-color` plus a gradient, neither of which counts — so in those two branches the
   * viewer contributes nothing to LCP at all. The fallback `<img>` is the exception, and it is
   * chosen for precisely the devices least able to absorb a lazy load: no WebGL, a software
   * rasteriser, Data Saver, ≤1GB of memory.
   *
   * Honest about its limit: the branch is only known after hydration, so this buys `fetchpriority`
   * and eager loading rather than a server-emitted `<link rel="preload">`. Worth several hundred
   * milliseconds on a constrained connection; not the same thing as a real preload.
   */
  priority?: boolean;
  /** Override the automatic decision. See `ModelViewerMode`. */
  mode?: ModelViewerMode;
  /**
   * The HDRI, from the self-hosted set in `ModelLighting` — never fetched from drei's CDN. `studio` is what
   * the model harness settled on against the real characters.
   */
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
 * The canvas's reach past the arch, handed to the stylesheet as the same numbers `ModelScene` frames
 * the camera with. See `./bleed`: if the two disagree, the character grows or slides instead of
 * escaping.
 */
const BLEED_STYLE = {
  '--model-bleed-inline': MODEL_BLEED.inline,
  '--model-bleed-top': MODEL_BLEED.top
} as CSSProperties;

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
    backdrop = true,
    badge,
    className,
    clips,
    environmentPreset = DEFAULT_PRESET,
    fallbackImage,
    interactive = false,
    label,
    mode = 'auto',
    orbit = false,
    priority = false,
    readout,
    restClip = 'idle',
    src
  } = props;

  const capability = useModelCapability();

  /*
   * The arch, as the canvas's event source. The canvas reaches past the arch and ignores the pointer,
   * so hover, tap and the player page's drag all have to be heard here instead. See `eventSource` on
   * `ModelScene`.
   */
  const stageRef = useRef<HTMLDivElement>(null);

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
    setModel((current) => {
      const clip = name ?? null;
      /*
       * Returning `current` unchanged is a real saving rather than hygiene. Every state object this
       * produces re-renders the whole canvas subtree through R3F's `diffProps`, and this fires on
       * each run of the rest effect — which includes StrictMode's double-invocation and any
       * dependency change that resolves to the clip already playing.
       */
      return current.loaded && current.clip === clip ? current : { ...current, clip, loaded: true };
    });
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
    // Capability is not overridable: no context at all still means the fallback image.
    if (!hasRenderer()) {
      return 'fallback';
    }
    /*
     * Nor is the reader's stated preference. A forced `animated` still yields the posed, silent
     * render on a machine asking for reduced motion — everything else about the force stands, so
     * the canvas mounts where `auto` would have refused it over a software rasteriser. See
     * `ModelViewerMode`.
     */
    if (mode === 'animated' && prefersReducedMotion()) {
      return 'static';
    }
    return mode;
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
   * Warm the GLB cache as soon as a canvas is known to be needed.
   *
   * **Not a parallel download, and this comment used to claim it was.** `preloadModel` reaches the
   * loader through `import('./ModelScene')`, so the GLB request cannot be issued until the chunk
   * carrying `three` has downloaded, parsed and evaluated — the file waits on the code either way.
   * Genuinely parallelising it would need the bytes fetched off a path that does not touch the 3D
   * chunk at all (a `<link rel="preload" as="fetch">` emitted by the page), and that only helps if
   * the preload matches three's own `FileLoader` request exactly; mismatched, it downloads four
   * megabytes twice. That is a page-level decision, not this component's.
   *
   * What it does buy is small but real: `<ModelScene>` mounts in this same commit and fires the same
   * dynamic import, so this mostly leads the real load by a microtask — but it is not conditional on
   * React committing the canvas subtree, which a transition or a suspended reveal can defer.
   * `useGLTF` caches by URL, so the two share one download whichever wins.
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
   * Three states, not two, and conflating the last two was a bug.
   *
   * `loading`  something is genuinely still on its way: the capability decision (the server render
   *            and the first hydrating render), or the model itself. The hatch shows *and breathes*.
   * `settled`  the arch is holding its final content — a character on the stage, or the fallback
   *            image — so the placeholder fades out entirely.
   * neither    the placeholder **is** the final render: no GLB authored, or a browser with no WebGL
   *            and no fallback image to offer it. The hatch stays, because it is the arch's empty
   *            ground rather than a spinner, and the breathe stops.
   *
   * That third case is why `.resting` exists. `settled` alone used to carry both jobs, so an empty
   * arch pulsed "still working" forever beside page content, with no pause, stop or hide — an
   * animation that both misinforms and fails WCAG 2.2.2 outright in the two branches
   * (`Loading`, `NoFallbackImage`) where neither disjunct could ever become true.
   *
   * `settled` is also now gated on `render === 'canvas'` rather than on `loaded` alone. `failed` is
   * set without clearing `loaded`, so a throw *after* a successful load — a lost WebGL context, a
   * drei runtime error — used to leave `loaded` true, the placeholder held at `opacity: 0`, and the
   * arch blank while still announcing an image to assistive tech.
   *
   * Note `data-model-loaded` stays canvas-only and unchanged: it reports whether *the model* is in
   * the scene, which is a different question from whether the arch has stopped waiting.
   */
  const loading = resolved === 'pending' || (render === 'canvas' && !model.loaded);
  const settled = render === 'image' || (render === 'canvas' && model.loaded);

  return (
    <div
      className={classNames(styles.viewer, { [styles.noBackdrop]: !backdrop }, className)}
      data-model-clip={model.clip ?? undefined}
      data-model-loaded={render === 'canvas' ? String(model.loaded) : undefined}
      data-model-mode={resolved}
      data-model-render={render}
    >
      {label ? (
        <Text
          as="span"
          className={styles.label}
          text={label}
          textTransform="uppercase"
          variant="mono"
          weight="regular"
        />
      ) : null}

      <div
        className={classNames(styles.stage, { [styles.resting]: !loading, [styles.settled]: settled })}
        onPointerDown={canHover ? triggerHover : undefined}
        onPointerEnter={canHover ? triggerHover : undefined}
        ref={stageRef}
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
          <div aria-label={alt} className={styles.canvasHolder} role="img" style={BLEED_STYLE}>
            <ModelScene
              animate={resolved === 'animated'}
              clips={clips}
              environmentPreset={environmentPreset}
              eventSource={stageRef}
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
            // The only LCP-eligible thing this component can render. See the prop's own note.
            priority={priority}
            sizes="(max-width: 768px) 60vw, 30vw"
          />
        ) : null}

        {/*
         * `Tag`, not a chip re-declared here. This rule was the near-miss second instance the note on
         * `ScheduleSection.location` named — the same object in the filled treatment rather than the
         * outline one — and `components/Tag` now owns the fill, radius, padding and type for both.
         * `.badge` keeps only its placement inside the arch and two documented re-points.
         *
         * Not uppercased and not tracked: the chip prints a file name, which is the one string here
         * that has to be reproduced exactly. `sm` is the caption step, 8×4 at desktop — what this was
         * already drawn at.
         */}
        {badge ? <Tag className={styles.badge} label={badge} size="sm" variant="filled" weight="regular" /> : null}
      </div>

      {readout ? (
        <Text
          as="span"
          className={styles.readout}
          text={readout}
          textTransform="uppercase"
          variant="mono"
          weight="regular"
        />
      ) : null}
    </div>
  );
};

export { preloadModel };
export default ModelViewer;
