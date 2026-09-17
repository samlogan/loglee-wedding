import { useEffect, useRef, useCallback } from 'react';

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[] & { push: (data: Record<string, unknown>) => void };
  }
}

type DataLayerFunction = (eventName?: string, data?: Record<string, unknown>) => void;

const useDataLayer = (): DataLayerFunction => {
  const dataLayerRef = useRef<typeof window.dataLayer>(undefined);

  useEffect(() => {
    dataLayerRef.current = window.dataLayer;
  }, []);

  const pushToDataLayer: DataLayerFunction = useCallback((eventName, data) => {
    dataLayerRef.current?.push({
      event: eventName || 'event',
      ...data
    });
  }, []);

  return pushToDataLayer;
};

export default useDataLayer;
