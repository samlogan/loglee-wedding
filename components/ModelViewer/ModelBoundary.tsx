'use client';

import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

export interface ModelBoundaryProps {
  /** Named in the console line, so a caught throw says which of the two fences caught it. */
  label: string;
  /** Rendered in place of the children after a throw. Defaults to nothing. */
  fallback?: ReactNode;
  /** Called once, on the commit that caught the error. Lets a parent change branch entirely. */
  onError?: (error: Error) => void;
  children: ReactNode;
}

interface ModelBoundaryState {
  failed: boolean;
}

/**
 * A minimal error boundary for the 3D subtree.
 *
 * `components/SectionErrorBoundary` cannot be used for either of the two places this is needed.
 * Its fallback is fixed — a `<div role="alert">` or `null` — and one of these fences sits *inside*
 * a `<Canvas>`, where a `<div>` is not a DOM node at all: R3F's reconciler would try to construct a
 * `THREE.Div` from it. This one renders whatever it is given and nothing by default, which is what
 * both cases need.
 *
 * It is also deliberately one-way. There is no `resetKeys`: both failures it guards are properties
 * of the *asset* rather than of the props (an unreachable HDRI, a GLB that will not parse), so
 * re-rendering the same subtree would throw again immediately. The viewer recovers on reload, which
 * is when the asset might have become reachable.
 *
 * ## What each fence catches
 *
 * - **around `<Canvas>`** — R3F's own boundary re-throws in the outer component
 *   (`if (error) throw error` in `Canvas`), so a `useGLTF` failure inside the canvas is catchable
 *   from the DOM tree. That is what lets a 404 on the GLB fall through to the player's fallback
 *   image rather than blanking the page.
 * - **inside the canvas, around the environment** — the HDRI is a separate 1.7MB request (from this
 *   site's own origin since MAM-1926), so a lighting asset can fail on its own. Caught there, the
 *   model keeps its plain lights.
 */
class ModelBoundary extends Component<ModelBoundaryProps, ModelBoundaryState> {
  state: ModelBoundaryState = { failed: false };

  static getDerivedStateFromError(): ModelBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console -- a 3D subtree that vanishes silently is undebuggable
    console.error(`ModelViewer: ${this.props.label} failed.`, error, info.componentStack);
    this.props.onError?.(error);
  }

  render() {
    return this.state.failed ? (this.props.fallback ?? null) : this.props.children;
  }
}

export default ModelBoundary;
