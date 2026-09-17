'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { RefObject } from 'react';

import useScrollDirection from '@/tools/hooks/useScrollDirection';

/** Pixels of scroll before the bar is allowed to lift off the page or slide away. */
const SCROLL_THRESHOLD = 100;

/**
 * The bar's one layout switch — the TypeScript twin of `$header-inline-switch`
 * (`tools/sass/base/__media.scss`), and deliberately in the same unit that file writes it in.
 *
 * Compared against the header's *inline size* rather than the window's, because that is what the
 * CSS keys on. A `matchMedia` would agree with it in the app, where the bar is a child of `<body>`,
 * and disagree the moment the bar is rendered in a column — which is exactly what the stories do.
 *
 * `rem` rather than the 900 this used to be, and the difference is a bug rather than a tidy-up.
 * `56.25rem` is 900px only while the root font size is the default 16px, and the SCSS is in `rem`
 * precisely so a reader who raised theirs is not handed a link list that no longer fits (WCAG
 * 1.4.4). A px constant here breaks the pairing in *both* directions, and the downward one is the
 * dangerous half: at a 12px root the CSS switches at 675px, so across 675–900px the CSS has
 * already taken the toggle *and* the panel away while this hook still believes the menu is shut —
 * leaving `overflow: hidden` on the body with nothing to unset it and the focus trap cycling the
 * two remaining controls, which is the exact WCAG 2.1.2 trap the effect below exists to prevent.
 * Measured in a browser at a 12px root, not reasoned about.
 */
const HEADER_INLINE_SWITCH_REM = 56.25;

/**
 * `$header-inline-switch` in px, against the root font size as it is *now*.
 *
 * Read per callback rather than once on mount so it cannot go stale — a reader can change their
 * browser's default size without reloading, and a `ResizeObserver` callback runs after layout has
 * settled, so reading a computed style in it forces nothing.
 */
const headerInlineSwitchPx = (): number =>
  HEADER_INLINE_SWITCH_REM * (Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16);

export interface HeaderState {
  menuOpen: boolean;
  closeMenu: () => void;
  toggleMenu: () => void;
  /** The bar has slid out of view on a downward scroll. */
  hidden: boolean;
}

/**
 * The header bar's own state: is the mobile menu open, and is the bar visible.
 *
 * The search half of this hook is gone with the search UI it drove — `showSearch` had no consumer
 * anywhere in the app, and the mutual-exclusion setters existed only to keep it away from the menu.
 *
 * `barRef` is the `<header>` element. The hook needs it to know when the layout has crossed the
 * switch; see the effect below for why that matters.
 */
const useHeaderState = (barRef: RefObject<HTMLElement | null>): HeaderState => {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const scrollDir = useScrollDirection();
  const [previousPathname, setPreviousPathname] = useState(pathname);

  // Navigating closes the menu. Adjusting state during render rather than in an effect is React's
  // documented pattern for "reset when a prop changes", and avoids a second paint with the menu
  // still open over the new page.
  if (pathname !== previousPathname) {
    setPreviousPathname(pathname);
    setMenuOpen(false);
  }

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const toggleMenu = useCallback(() => setMenuOpen((open) => !open), []);

  /*
   * Growing past the switch closes the menu, and this is a keyboard trap fix rather than tidiness.
   *
   * Above the switch the CSS takes both halves of the disclosure away: the toggle is `display: none`
   * and so is the panel. Nothing else clears `menuOpen` — not the toggle, which is gone; not
   * Escape, which no longer has a visible affordance pointing at it. So a menu opened on a phone and
   * then widened (rotate the device, drag the window, resize the story's column) left the page with
   * `overflow: hidden` and no way to scroll it, and left the focus trap active over the two controls
   * still in the bar, cycling between them with the rest of the document unreachable — WCAG 2.1.2.
   *
   * A `ResizeObserver` on the bar rather than a resize listener on the window, for the same reason
   * the CSS is a container query: it observes the box the layout actually depends on. It also fires
   * once on observe, so a menu that is somehow already open at desktop width is closed on mount.
   */
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width >= headerInlineSwitchPx()) {
        setMenuOpen(false);
      }
    });
    observer.observe(bar);
    return () => observer.disconnect();
  }, [barRef]);

  useEffect(() => {
    const handleScroll = () => {
      setHidden(window.scrollY > SCROLL_THRESHOLD && scrollDir !== 'up');
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [scrollDir]);

  // The page behind the menu does not scroll. Restored to whatever it was rather than to `''`, so
  // this cannot clear a lock some other component (the modal) is holding at the same time.
  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    /*
     * The scrollbar's width, handed straight back as padding — and here that is a correctness fix,
     * not the usual polish about content not jumping.
     *
     * `tools/sass/global/_reset.scss` sets no `overflow` on `<html>`, so the body's `hidden`
     * propagates to the viewport and a classic space-taking scrollbar (Windows, Linux, or macOS set
     * to "Show scroll bars: Always") disappears — widening the body's content box, and with it the
     * bar's, by those ~15px. The observer above watches exactly that box. So on a viewport sitting
     * in the scrollbar-wide band just below the switch, opening the menu grew the bar past the
     * switch, the observer closed it, the lock came off, the scrollbar returned and the width fell
     * back: the menu opened and shut in one frame and the hamburger read as dead. It is not an
     * observer loop — React bails on the unchanged `false`, so nothing logs — which is what makes
     * it the kind of bug that gets reported as "the button sometimes doesn't work".
     *
     * Giving the width back means the lock changes nothing the observer can see. Nil on overlay
     * scrollbars (macOS by default), where the measurement is 0 and no padding is written.
     */
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [menuOpen]);

  return {
    // The bar carries the only control that closes the menu, so it must not slide away underneath
    // an open one — which a scroll inside the panel would otherwise do.
    hidden: hidden && !menuOpen,
    closeMenu,
    menuOpen,
    toggleMenu
  };
};

export default useHeaderState;
