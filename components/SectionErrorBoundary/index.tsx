'use client';

import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

import styles from './styles.module.scss';

export interface SectionErrorBoundaryProps {
  /** Shown in the fallback so a reader knows which section failed. */
  name?: string;
  /**
   * Render the error and stack instead of nothing. Defaults to `false`, so the production behaviour
   * is the safe one by default: a visitor loses the broken section, not the page, and never sees a
   * stack trace.
   *
   * This is a prop rather than an internal `NODE_ENV` check on purpose. A built Storybook is a
   * production build, so an environment check would hide section errors in the deployed Storybook —
   * exactly where a reviewer needs to see them. The caller knows which it is; the boundary does not.
   *
   * Note the cost of `true` on a publicly-deployed Storybook: the fallback prints `error.stack`,
   * which carries bundle chunk paths and module names. That is the right trade for a reviewer tool,
   * but it is a trade.
   */
  showDetails?: boolean;
  /**
   * Clear a caught error when any of these values changes, compared shallowly with `Object.is`.
   *
   * Without it the boundary latches for the life of the instance: once `state.error` is set it keeps
   * rendering the fallback even after the input that caused the throw is gone. In Storybook that
   * means one bad control combination pins a stack trace across every later change; in the app it
   * means an editor fixing the document leaves the section blank until a full reload, because the
   * `key` in the section renderer is the Sanity `_key` and does not change with content.
   *
   * Pass values that change only when the input changes — a story id, a theme name, an args object.
   * Do **not** pass `children`. The section renderer builds it with `createElement`, so it is a new
   * object on every render, and resetting on it would loop: clear the error, rethrow, clear again.
   */
  resetKeys?: readonly unknown[];
  children: ReactNode;
}

interface SectionErrorBoundaryState {
  error: Error | null;
  /**
   * The reset keys as they were when the error was captured.
   *
   * Compared against, rather than against the previous render's props. `resetKeys` typically contains
   * something with a churning identity — a Storybook args object, a section's props — so comparing
   * consecutive renders makes *any* parent update look like a change, and the boundary clears the
   * error and rethrows on every one of them. Anchoring on the keys held at the moment of the error
   * means it clears exactly once per genuine change.
   */
  errorKeys: readonly unknown[] | null;
}

/**
 * Catches a throwing section and renders what went wrong in its place.
 *
 * ## Why a class component
 *
 * The one place this codebase departs from the arrow-function rule in CLAUDE.md.
 * `getDerivedStateFromError` and `componentDidCatch` have no hook equivalent — React has never
 * shipped one — so an error boundary must be a class.
 *
 * ## Why this exists
 *
 * A section that throws takes the whole tree down with it. On a Storybook docs page that means one
 * bad fixture blanks every other section on the page, with no clue which one caused it. In the app
 * it means a white screen.
 *
 * ## What it does and does not catch
 *
 * Narrower than it looks, and worth stating because the boundary reads as more protective than it
 * is. This is a **client** boundary, so it catches throws during client render — hydration, and the
 * client components a section composes (a carousel, a modal, form fields).
 *
 * It does **not** catch a throw during *server* rendering. That error never reaches the client as a
 * render at all; Next.js routes it to `app/error.tsx`, which replaces the whole page. So the classic
 * section crash — GROQ projecting an empty array as `null`, where a destructuring default only
 * covers `undefined`, so `const { items = [] } = props` still hands `null` to `.map()` — is **not**
 * contained here when the section is a server component, which most are.
 *
 * That class of failure still has to be prevented in the section or the projection; `app/error.tsx`
 * is the backstop. What this boundary reliably buys is Storybook: every section story renders
 * client-side, so a bad fixture shows a named, contained error instead of a blank canvas.
 */
class SectionErrorBoundary extends Component<SectionErrorBoundaryProps, SectionErrorBoundaryState> {
  state: SectionErrorBoundaryState = { error: null, errorKeys: null };

  static getDerivedStateFromError(error: Error): Partial<SectionErrorBoundaryState> {
    return { error };
  }

  componentDidMount() {
    this.captureKeys();
  }

  componentDidUpdate() {
    const { resetKeys } = this.props;
    const { error, errorKeys } = this.state;

    if (!error) {
      return;
    }
    // First render after the throw: remember the keys the error happened under.
    if (!errorKeys) {
      this.captureKeys();
      return;
    }
    if (!resetKeys) {
      return;
    }
    const changed =
      resetKeys.length !== errorKeys.length || resetKeys.some((key, index) => !Object.is(key, errorKeys[index]));
    if (changed) {
      this.setState({ error: null, errorKeys: null });
    }
  }

  private captureKeys() {
    if (this.state.error && !this.state.errorKeys) {
      this.setState({ errorKeys: this.props.resetKeys ?? [] });
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // The fallback shows the message; the console keeps the real stack, which is what you actually
    // debug from.
    // eslint-disable-next-line no-console -- an error boundary that swallows the stack is worse than useless
    console.error('Section failed to render:', this.props.name ?? 'unknown', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    const { children, name, showDetails = false } = this.props;

    if (!error) {
      return children;
    }

    // Drop the section rather than the page. `componentDidCatch` has already logged the real stack.
    if (!showDetails) {
      return null;
    }

    return (
      <div className={styles.boundary} role="alert">
        <p className={styles.title}>{name ? `${name} failed to render` : 'Section failed to render'}</p>
        <p className={styles.message}>{error.message}</p>
        {error.stack ? <pre className={styles.stack}>{error.stack}</pre> : null}
      </div>
    );
  }
}

export default SectionErrorBoundary;
