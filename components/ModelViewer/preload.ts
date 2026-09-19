/**
 * Warm a model's cache before anything renders it.
 *
 * The import inside is dynamic, and that is the point: this module is reachable from ordinary page
 * code, and a static `import` of `./ModelScene` would pull `three`, `@react-three/fiber` and
 * `@react-three/drei` into whatever bundle touched it — undoing the `next/dynamic` split in
 * `index.tsx` from the other end.
 *
 * `useGLTF` caches by URL, so the preload and the later mount share one download. Two callers get
 * real value from it:
 *
 *   - the viewer itself, which fires this the moment it knows it is going to render a canvas, so
 *     the GLB and the scene chunk download *in parallel* rather than the file waiting on the code;
 *   - a page that knows where the reader is going next — the select screen prefetching a player
 *     page's model on hover, which is the whole reason this is exported rather than private.
 *
 * On the home page the viewer's own call fires once per card, in the same commit, so both characters
 * (~8MB together) start downloading at once. That is decided, not accidental: MAM-1926 kept both eager,
 * and the reasoning lives with the implementation in `sections/PlayerSelectSection/index.tsx`, under
 * "Both models load eagerly" — a staggered reveal reads as one broken card, and calling this any
 * earlier than the viewer does would send ~8MB to the devices that end up on the fallback image. If
 * deferral is ever wanted the lever is the section withholding the second card's `src` until idle or
 * interaction, not a change here.
 *
 * Returns nothing rather than a promise, so a caller cannot be tempted to await an optimisation.
 * Safe to call with nothing, on the server, and repeatedly.
 */
export const preloadModel = (src?: string): void => {
  if (!src || typeof window === 'undefined') {
    return;
  }

  import('./ModelScene')
    .then(({ preloadModelScene }) => preloadModelScene(src))
    .catch(() => {
      /*
       * A preload must not be able to break a page. The chunk failing to load here means the
       * viewer's own dynamic import will fail too, and *that* failure is the one worth surfacing —
       * it happens where there is a fallback image to show instead.
       */
    });
};
