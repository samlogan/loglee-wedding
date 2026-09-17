'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import useScrollDirection from '@/tools/hooks/useScrollDirection';

/** Pixels of scroll before the bar is allowed to lift off the page or slide away. */
const SCROLL_THRESHOLD = 100;

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
 */
const useHeaderState = (): HeaderState => {
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
