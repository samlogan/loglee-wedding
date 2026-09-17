'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { RefObject } from 'react';

import useScrollDirection from '@/tools/hooks/useScrollDirection';

/** Pixels of scroll before the bar is allowed to lift off the page or slide away. */
const SCROLL_THRESHOLD = 100;

/**
 * The bar's one layout switch, in px — the TypeScript twin of `$header-inline-switch`
 * (`tools/sass/base/__media.scss`), which is the same 900px written as `56.25rem`.
 *
 * Compared against the header's *inline size* rather than the window's, because that is what the
 * CSS keys on. A `matchMedia` would agree with it in the app, where the bar is a child of `<body>`,
 * and disagree the moment the bar is rendered in a column — which is exactly what the stories do.
 */
const HEADER_INLINE_SWITCH = 900;

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
      if (entry.contentRect.width >= HEADER_INLINE_SWITCH) {
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
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
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
