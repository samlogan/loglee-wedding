'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';

import useScrollDirection from '@/tools/hooks/useScrollDirection';

interface HeaderState {
  showSearch: boolean;
  setShowSearch: (showSearch: boolean) => void;
  mobileNavOpen: boolean;
  setMobileNavOpen: (mobileNavOpen: boolean) => void;
  hidden: boolean;
  atTop: boolean;
}

const useHeaderState = (): HeaderState => {
  const pathname = usePathname();
  const [showSearch, setShowSearchState] = useState<boolean>(false);
  const [mobileNavOpen, setMobileNavOpenState] = useState<boolean>(false);
  const [hidden, setHidden] = useState(false);
  const [atTop, setAtTop] = useState(true);
  const scrollDir = useScrollDirection();
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Reset on pathname change (React pattern for adjusting state from changed props)
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setShowSearchState(false);
    setMobileNavOpenState(false);
  }

  // Setters that handle mutual exclusion (replaces cross-setting effects)
  const setShowSearch = useCallback((show: boolean) => {
    setShowSearchState(show);
    if (show) {
      setMobileNavOpenState(false);
    }
  }, []);

  const setMobileNavOpen = useCallback((open: boolean) => {
    setMobileNavOpenState(open);
    if (open) {
      setShowSearchState(false);
    }
  }, []);

  // Hide header on scroll down
  useEffect(() => {
    const handleScroll = () => {
      const scrollingUp = scrollDir === 'up';
      const THRESHOLD = 100;
      const scrolledPastThreshold = window.scrollY > THRESHOLD;
      setHidden(scrolledPastThreshold && !scrollingUp);
      setAtTop(!scrolledPastThreshold);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [scrollDir]);

  // Prevent scrolling while search or mobile nav is open
  useEffect(() => {
    document.body.style.overflow = showSearch || mobileNavOpen ? 'hidden' : '';
  }, [showSearch, mobileNavOpen]);

  return {
    atTop,
    hidden,
    mobileNavOpen,
    setMobileNavOpen,
    setShowSearch,
    showSearch
  };
};

export default useHeaderState;
