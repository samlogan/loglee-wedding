'use client';

import { Environment, useEnvironment } from '@react-three/drei';
import { Suspense } from 'react';

import ModelBoundary from './ModelBoundary';

/**
 * The HDRIs the viewers light with, served from this site's own origin (MAM-1926).
 *
 * These are byte-for-byte the files drei's `preset` prop would fetch — the same names, from the same
 * pinned commit of `pmndrs/drei-assets` (`456060a…`, drei's `CUBEMAP_ROOT`). Asking drei for a preset
 * resolves to `raw.githack.com`, which redirects to `raw.githubusercontent.com`: two more origins and
 * two more TLS handshakes on the high-latency connection the budget is written for, on hosts with no
 * availability promise. `ModelCharacter` turns Draco off for the same reason. Hosted in `public/hdri/`
 * they arrive over the connection the page already has, and are versioned with the code that uses them.
 *
 * **Nothing changes visually.** `useEnvironment` picks its loader, texture mapping and colour space from
 * the file itself — `RGBELoader`, equirectangular, linear sRGB for a single `.hdr` — so passing `files`
 * rather than `preset` changes only the URL the bytes come from.
 *
 * Both files are Poly Haven HDRIs (CC0) at 1k. To add one, copy it from the same drei-assets commit into
 * `public/hdri/` and add it here; the type below follows.
 */
const ENVIRONMENT_FILES = {
  studio: '/hdri/studio_small_03_1k.hdr',
  // Hosted for the `SunsetLighting` story, which proves the prop is wired through. No page uses it.
  sunset: '/hdri/venice_sunset_1k.hdr'
} as const;

/**
 * The HDRIs a caller may ask for — the hosted set, not drei's ten preset names.
 *
 * Derived from the map rather than from drei's union, so a name that is not hosted is a compile error
 * instead of a silent runtime fetch from a third-party CDN.
 */
export type ModelEnvironmentPreset = keyof typeof ENVIRONMENT_FILES;

/**
 * The lighting the model gets while the HDRI is in flight, and if it never arrives.
 *
 * Deliberately plain — a fill and a key, no environment map, no shadows. It is not an imitation of
 * the preset; it is there so a reader whose network dropped the HDRI sees a lit character rather
 * than a silhouette. Suspense fallback and error fallback are the same lights on purpose, so the
 * slow case and the failed case look identical instead of one of them being a flash of darkness.
 */
const FallbackLighting = () => (
  <>
    <ambientLight intensity={0.6} />
    <directionalLight intensity={2.5} position={[2, 3, 4]} />
  </>
);

/**
 * Loads the HDRI and hands it to drei as a `map`, instead of letting drei load it by preset.
 *
 * **This is the per-renderer PMREM fix, and it is the whole reason this component exists.**
 *
 * What is safe to share between canvases is the *source* equirectangular texture: drei's
 * `useEnvironment` loads it through `useLoader`, which caches globally by URL, and three.js then
 * builds a PMREM from it lazily inside `WebGLCubeUVMaps` — a cache that belongs to a single
 * `WebGLRenderer`. Two canvases therefore build two PMREMs from one download, which is exactly what
 * is wanted: a PMREM belongs to the context that created it, and sharing one across renderers
 * leaves every canvas but the first black.
 *
 * The trap is what drei does on the way out. `<Environment preset="…">` renders `EnvironmentCube`,
 * which ends with `useEffect(() => () => texture.dispose(), [texture])` — and `texture` is the
 * *shared, globally cached* source. The home page mounts two viewers; the moment one of them
 * unmounts (a route change, a StrictMode double-mount, a Storybook story swap) it disposes the
 * texture out from under the other, three drops the PMREM built from it, and the surviving canvas
 * goes black with no error.
 *
 * Passing the texture in as `map` routes through `EnvironmentMap` instead, which sets
 * `scene.environment`, restores the previous value on unmount, and disposes nothing. The texture
 * stays in the `useLoader` cache, where it was always going to live anyway.
 *
 * Self-hosting did not change any of that, and must not: `files` goes to `useEnvironment`, never to
 * `<Environment>`. `<Environment files="…">` is the same trap as `preset` — handed a URL rather than a
 * `map`, drei loads the texture itself and disposes it on unmount.
 */
const PresetEnvironment = ({ preset }: { preset: ModelEnvironmentPreset }) => {
  const texture = useEnvironment({ files: ENVIRONMENT_FILES[preset] });
  return <Environment map={texture} />;
};

export interface ModelLightingProps {
  preset: ModelEnvironmentPreset;
}

/**
 * Environment-preset lighting, with a plain-light floor under it.
 *
 * Its `Suspense` boundary is its own rather than shared with the model above it, which matters: the
 * two suspend independently, so a slow HDRI does not hold back a GLB that has already decoded.
 */
const ModelLighting = ({ preset }: ModelLightingProps) => (
  <ModelBoundary fallback={<FallbackLighting />} label="environment lighting">
    <Suspense fallback={<FallbackLighting />}>
      <PresetEnvironment preset={preset} />
    </Suspense>
  </ModelBoundary>
);

export { FallbackLighting };
export default ModelLighting;
