'use client';

import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

/**
 * Everything the browser will put in the tab order, plus the two elements that only get there by
 * being given one. Deliberately narrow: `[contenteditable]` and `<audio controls>` exist but the
 * header cannot contain them, and a wider list is a wider surface for the `:not()` clauses to be
 * wrong on.
 */
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

/**
 * The focusable descendants that are actually reachable right now.
 *
 * Two filters, and neither is optional. `getClientRects().length` drops anything the cascade has
 * hidden — which is how the *other* half of the header disappears at each width: the desktop link
 * list is `display: none` on a phone and the mobile panel is `display: none` above the bar's
 * container breakpoint, and both are still in the DOM. `closest('[inert]')` drops the closed menu:
 * `inert` is what keeps its links out of the tab order, and a trap that counted them would wrap to
 * an element the browser refuses to focus, stranding focus wherever it already was.
 *
 * `getClientRects()` rather than `offsetParent`, which is null for a `position: fixed` element and
 * would report a perfectly visible control as hidden.
 */
const reachableWithin = (root: HTMLElement): HTMLElement[] =>
  [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (element) => element.getClientRects().length > 0 && !element.closest('[inert]')
  );

export interface UseFocusTrapProps {
  /** While true, focus is held inside `containerRef` and Escape calls `onEscape`. */
  active: boolean;
  containerRef: RefObject<HTMLElement | null>;
  /** Where focus lands when the trap activates. Defaults to the first reachable element. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Where focus returns when it deactivates. Defaults to whatever had focus beforehand. */
  returnFocusRef?: RefObject<HTMLElement | null>;
  onEscape?: () => void;
}

/**
 * Hold keyboard focus inside one element while a disclosure is open, and hand it back when it
 * closes.
 *
 * The trap's container here is the whole `<header>`, not just the panel, and that is the point:
 * the bar stays visible above the open menu, so its wordmark, RSVP pill and the close toggle are
 * all still on screen and all still have to be reachable. Trapping to the panel alone would make
 * the toggle — the only way to close the menu with a pointer — untabbable.
 *
 * Escape is listened for on `document` rather than on the container. Focus is inside the container
 * by construction, so a container listener would *usually* work; "usually" is doing too much work
 * when the failure mode is a menu that cannot be dismissed from the keyboard (WCAG 2.1.2).
 */
const useFocusTrap = (props: UseFocusTrapProps): void => {
  const { active, containerRef, initialFocusRef, returnFocusRef, onEscape } = props;

  /*
   * The callback is read through a ref so it is not an effect dependency.
   *
   * An inline `onEscape={() => setOpen(false)}` is a new function every render, which would tear
   * the effect down and set it up again on each one — re-running the "move focus in" step, and
   * running the cleanup's "hand focus back" step, while the menu is still open. Focus would snap
   * to the toggle mid-interaction. Written in its own effect rather than during render, so this
   * stays a pure render under React Compiler's rules.
   */
  const onEscapeRef = useRef(onEscape);
  useEffect(() => {
    onEscapeRef.current = onEscape;
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!(active && container)) {
      return;
    }

    const previouslyFocused = document.activeElement as HTMLElement | null;
    (initialFocusRef?.current ?? reachableWithin(container)[0])?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onEscapeRef.current?.();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      /*
       * Recomputed per keystroke rather than captured on open. The list changes under us: the
       * panel's links become reachable when `inert` comes off, and a resize across the bar's
       * container breakpoint swaps which half of the nav is displayed.
       */
      const reachable = reachableWithin(container);
      /*
       * Nothing to hold focus on, so let go of it rather than eat the keystroke.
       *
       * This used to `preventDefault()` and return, which is a keyboard trap by definition — the
       * one thing this hook exists to prevent (WCAG 2.1.2). It is currently unreachable (`active`
       * implies a rendered toggle, and above the switch the desktop links are displayed), but a
       * fail-safe whose failure mode *is* the failure is the wrong shape regardless. Asking the
       * consumer to close and letting the Tab through is the behaviour that degrades safely.
       */
      if (reachable.length === 0) {
        onEscapeRef.current?.();
        return;
      }

      const first = reachable[0];
      const last = reachable.at(-1) as HTMLElement;
      const focused = document.activeElement as HTMLElement | null;

      // Focus escaped the container entirely — a click on the page behind, or a return from the
      // browser's own chrome. Pull it back to whichever end the Tab direction is heading for.
      if (!focused || !container.contains(focused)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }

      if (event.shiftKey && focused === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && focused === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      /*
       * `returnFocusRef` first, because "what had focus before" is the wrong answer when the menu
       * was opened by a pointer: a click leaves focus on the toggle in every browser except Safari,
       * where it stays on `<body>` — and focusing `<body>` on close would drop the keyboard user at
       * the top of the document. The toggle is the correct destination either way.
       *
       * …but only while it is still on screen. `focus()` on a `display: none` element is a silent
       * no-op, and the trap does not only deactivate because someone dismissed it: the header also
       * closes the menu when the layout grows past the switch, and above that switch the toggle is
       * `display: none`. Measured on that path — the panel link that had focus was blurred to
       * `<body>` by its own `display: none`, the toggle refused the focus, and a keyboard user who
       * merely rotated a tablet was dropped at the top of the document. Falling back to whatever is
       * still reachable in the container keeps them where they were working.
       *
       * Optional chaining covers unmount: the ref is null and the container is detached by the time
       * this runs, `reachableWithin` filters everything out on zero client rects, and both calls
       * become no-ops.
       */
      const returnTo = returnFocusRef?.current ?? previouslyFocused;
      if (returnTo?.getClientRects().length) {
        returnTo.focus();
      } else {
        reachableWithin(container)[0]?.focus();
      }
    };
  }, [active, containerRef, initialFocusRef, returnFocusRef]);
};

export default useFocusTrap;
