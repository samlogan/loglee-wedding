import { useEffect, useRef } from 'react';

import { useMediaQuery } from './useMediaQuery';

interface UseLockBodyScrollProps {
  disabled?: boolean;
  mediaQuery?: string;
}

// This hook takes a boolean value indicating whether the modal is open
const useLockBodyScroll = ({ disabled = false, mediaQuery = '(max-width: 768px)' }: UseLockBodyScrollProps): void => {
  const originalStyleRef = useRef('');
  const isMobile = useMediaQuery(mediaQuery);

  useEffect(() => {
    // If the modal is open, we want to lock the body scroll
    if (isMobile && disabled) {
      // Store the original value of the body overflow
      originalStyleRef.current = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';

      // When the effect is cleaned up, reset the body overflow to its original value
      return () => {
        document.body.style.overflow = originalStyleRef.current;
      };
    }

    if (!isMobile && disabled) {
      document.body.style.overflow = originalStyleRef.current;
    }
  }, [disabled, isMobile]);
};

export default useLockBodyScroll;
