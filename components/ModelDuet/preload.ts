/**
 * Warm both characters' caches before anything renders them.
 *
 * The import inside is dynamic, and that is the point: this module is reachable from ordinary page
 * code, and a static `import` of `./ModelDuetScene` would pull `three`, `@react-three/fiber` and
 * `@react-three/drei` into whatever bundle touched it — undoing the `next/dynamic` split in
 * `index.tsx` from the other end.
 *
 * `useGLTF` caches by URL, so a preload and the later mount share one download. The caller that
 * matters is the RSVP form: it knows the reader is one submit away from the thank-you page, and
 * these are two four-megabyte files. Calling this as the form is filled in is the difference
 * between the pair being there on arrival and the reader watching a hatched placeholder.
 *
 * Returns nothing rather than a promise, so a caller cannot be tempted to await an optimisation.
 * Safe to call on the server and repeatedly.
 */
export const preloadDuet = (sources: string[]): void => {
  if (typeof window === 'undefined' || sources.length === 0) {
    return;
  }

  import('./ModelDuetScene')
    .then(({ preloadDuetScene }) => preloadDuetScene(sources))
    .catch(() => {
      /*
       * A preload must not be able to break a page. The chunk failing to load here means the
       * scene's own dynamic import will fail too, and *that* failure is the one worth surfacing —
       * it happens where there is a fallback to show instead.
       */
    });
};
