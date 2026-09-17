'use client';

import { useSyncExternalStore } from 'react';

/**
 * What this browser, on this machine, with this reader's stated preferences, should be given.
 *
 *   pending   nothing has been decided yet — the server render, and the first client render of a
 *             hydrating tree. Always renders the placeholder.
 *   animated  the full canvas, clips playing.
 *   static    the canvas, posed at the first frame of the rest clip and never advanced.
 *   fallback  no canvas at all — the player's fallback image.
 */
export type ModelCapability = 'pending' | 'animated' | 'static' | 'fallback';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/**
 * Renderer classes, in the order they matter.
 *
 *   ok           a GPU-backed context. Render everything.
 *   software     a context exists, but it is rasterised on the CPU — SwiftShader on a machine whose
 *                driver Chrome has blocklisted, llvmpipe on a bare Linux box, the same under a
 *                headless browser. A 4MB rigged character at 60fps is not something a CPU
 *                rasteriser does; this is the "very slow device" arm of the brief.
 *   unsupported  no context at all.
 */
type RendererClass = 'ok' | 'software' | 'unsupported';

/**
 * Probed once per page, not once per viewer.
 *
 * Creating a WebGL context costs real time and, more importantly, browsers cap how many live
 * contexts a document may hold (16 in Chrome) and silently kill the oldest past that. The home page
 * renders two real canvases; a probe per viewer per render would churn through that budget for an
 * answer that cannot change within a page view.
 */
let rendererClass: RendererClass | undefined;

/** Names that mean "this is being drawn by the CPU". Matched loosely — the strings are vendor prose. */
const SOFTWARE_RENDERERS = /swiftshader|llvmpipe|software|microsoft basic render/i;

const probeRenderer = (): RendererClass => {
  let canvas: HTMLCanvasElement | undefined;
  try {
    canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) {
      return 'unsupported';
    }

    /*
     * `WEBGL_debug_renderer_info` is the only way to see past ANGLE's generic strings, and it is
     * absent whenever a browser or an anti-fingerprinting extension withholds it. Absent is not
     * "software" — it is "no evidence" — so the fallthrough is `ok`. Guessing the other way would
     * drop the 3D for every privacy-conscious reader on a perfectly capable machine.
     */
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = debugInfo ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) ?? '') : '';
    if (renderer && SOFTWARE_RENDERERS.test(renderer)) {
      return 'software';
    }

    /*
     * Two more signals, both cheap and both deliberately conservative.
     *
     * `saveData` is a stated preference rather than a measurement — the reader has asked not to be
     * sent large files, and a multi-megabyte GLB is exactly that. `deviceMemory` is quantised by
     * the spec to 0.25/0.5/1/2/4/8, is absent outside Chromium, and is consulted only at its floor:
     * a gigabyte cannot hold a decoded rigged character, its textures and a PMREM at once.
     *
     * **`hardwareConcurrency` is deliberately not consulted**, and that is a correction rather than
     * an omission. A two-core machine is a plausible reading of "very slow device", but it is also
     * what Brave reports to *every* site under strict fingerprinting protection, and what several
     * privacy extensions report on hardware that is perfectly capable. The cost of the false
     * positive — a privacy-conscious reader silently downgraded to a still image — is larger than
     * what the signal buys on top of the renderer check, which catches the genuinely slow case
     * directly rather than by proxy.
     */
    const nav = navigator as Navigator & {
      connection?: { saveData?: boolean };
      deviceMemory?: number;
    };
    if (nav.connection?.saveData === true) {
      return 'software';
    }
    if (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 1) {
      return 'software';
    }

    return 'ok';
  } catch {
    // A throw here is a browser refusing to make a context at all, which is the same answer as null.
    return 'unsupported';
  } finally {
    /*
     * Hand the context back rather than waiting for GC. Without this the probe context counts
     * against the per-document limit for as long as the canvas is reachable, and on the home page
     * the two real canvases are created moments later.
     */
    const lose = canvas?.getContext('webgl2') ?? canvas?.getContext('webgl');
    (lose as WebGLRenderingContext | null)?.getExtension('WEBGL_lose_context')?.loseContext();
  }
};

/** Whether a canvas can be mounted **at all**. See the note on `mode` in `index.tsx`. */
export const hasRenderer = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }
  rendererClass ??= probeRenderer();
  return rendererClass !== 'unsupported';
};

const readCapability = (): ModelCapability => {
  if (typeof window === 'undefined') {
    return 'pending';
  }

  rendererClass ??= probeRenderer();
  if (rendererClass !== 'ok') {
    return 'fallback';
  }

  return window.matchMedia(REDUCED_MOTION).matches ? 'static' : 'animated';
};

/**
 * Subscribe to the one input that can change while the page is open.
 *
 * The renderer cannot change; the reader's motion preference can, and does — macOS and Windows both
 * expose it as a switch, and a reader who flips it mid-visit should not have to reload to be obeyed.
 */
const subscribe = (onChange: () => void) => {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};

const serverSnapshot = (): ModelCapability => 'pending';

/**
 * `useSyncExternalStore`, not `useState` + `useEffect`.
 *
 * This is the shape React provides for exactly this problem — a value that only exists in the
 * browser, that must read as something else during SSR, and that can change from outside React. The
 * alternative spelling is a `useState(null)` seeded by an effect, which is the setState-in-effect
 * pattern CLAUDE.md asks this project to avoid, costs an extra commit on every mount, and has to
 * re-implement the media-query subscription by hand anyway.
 *
 * Three properties make it safe here, and all three are easy to break:
 *
 *   - `getSnapshot` returns a **string**. A snapshot that allocates (an object, an array) is a new
 *     value every call and React re-renders forever.
 *   - `subscribe`, `readCapability` and `serverSnapshot` are module-level constants. Defined inside
 *     the hook they would be new functions per render, and React would tear down and re-attach the
 *     media-query listener on each one.
 *   - the server snapshot is `pending`, which is also what the first client render of a hydrating
 *     tree uses. The markup therefore matches, and the real capability arrives on the render after
 *     hydration. In Storybook there is no hydration, so `getSnapshot` runs on the first render and
 *     the story has its answer immediately — no `waitFor` needed to see the resolved branch.
 */
const useModelCapability = (): ModelCapability => useSyncExternalStore(subscribe, readCapability, serverSnapshot);

export default useModelCapability;
