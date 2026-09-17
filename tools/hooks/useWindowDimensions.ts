import { useState, useEffect } from 'react';

function useWindowDimensions() {
  const isClient = typeof window === 'object';

  const [windowDimensions, setWindowDimensions] = useState(
    isClient
      ? {
          height: window.innerHeight,
          width: window.innerWidth
        }
      : { height: 0, width: 0 }
  );

  useEffect(() => {
    if (!isClient) {
      return;
    }

    function handleResize() {
      setWindowDimensions({
        height: window.innerHeight,
        width: window.innerWidth
      });
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isClient]);

  return windowDimensions;
}

export default useWindowDimensions;
