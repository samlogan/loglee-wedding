import { useEffect, useRef, useCallback } from 'react';

export const useTimeout = (callback: () => void, timeout = 0): (() => void) => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  useEffect(() => {
    timeoutRef.current = setTimeout(callback, timeout);
    return cancel;
  }, [callback, timeout, cancel]);

  return cancel;
};

export default useTimeout;
