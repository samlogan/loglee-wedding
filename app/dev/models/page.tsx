import type { Metadata } from 'next';

import ModelHarness from './ModelHarness';

/**
 * 3D model harness.
 *
 * Lives outside the `(frontend)` route group deliberately, so it renders against the bare root
 * layout with no header, footer or page chrome — the canvas is the only thing under test.
 *
 * It runs on the same stack the real `ModelViewer` will use (R3F + drei), rather than a standalone
 * three.js page. A harness on a different stack proves very little: it would not exercise drei's
 * `useGLTF`, which is what silently handles `EXT_meshopt_compression` for the compressed GLBs.
 *
 * Reachable in production as well as locally, so a model can be checked on a real device over a
 * real connection — which is where the performance budget in the brief actually gets tested.
 * It stays out of the sitemap and search results via the metadata below.
 */
export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: 'Model harness'
};

const ModelsPage = () => <ModelHarness />;

export default ModelsPage;
