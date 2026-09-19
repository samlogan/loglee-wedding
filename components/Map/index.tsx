'use client';

import { AdvancedMarker, APIProvider, Map as GoogleMap } from '@vis.gl/react-google-maps';
import { useInView } from 'motion/react';
import { useRef } from 'react';

import classNames from '@/helpers/classNames';
import { resolveMapLocation } from '@/helpers/mapLocation';
import type { MapLocation } from '@/helpers/mapLocation';

import styles from './styles.module.scss';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

/*
 * `AdvancedMarker` needs a map ID. `DEMO_MAP_ID` is Google's shared one: default styling, no cloud
 * configuration. Set `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` to a map ID from the Cloud console to restyle
 * the map without a deploy.
 */
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';

export interface MapProps {
  className?: string;
  /** A Sanity `geopoint`. Nothing renders without one. */
  location?: MapLocation | null;
  /**
   * The map's accessible name — "Map of 406 Jamberoo Mountain Rd". Required, because the map is a
   * landmark a screen-reader user has to decide whether to enter, and "map" alone does not say of
   * what.
   */
  label: string;
  /**
   * `compact` drops the map's own controls for a small card, where the zoom buttons and map-type
   * switch would cover most of the picture. Pinch and ctrl+scroll still zoom.
   */
  variant?: 'default' | 'compact';
  /** Follows the page's theme so a dark page does not hold a white rectangle. */
  theme?: ProjectTheme;
}

/**
 * A live Google map centred on one point, with a marker on it.
 *
 * ## It fills its parent
 *
 * The component has no size of its own — the caller's box decides it, which is what lets the FAQ's
 * fixed-height card and `MapSection`'s editor-chosen aspect ratios share it.
 *
 * ## Loaded when it approaches the viewport
 *
 * The Maps JavaScript API is several hundred kilobytes of third-party script and a billed map load.
 * Both maps on this site sit well below the fold, so the API is only requested once the box comes
 * within a screen of the viewport. Until then the box is a `--bg-accent` surface.
 *
 * ## `cooperative` gesture handling
 *
 * A map that fills the viewport would otherwise swallow the page's scroll: a reader scrolling past
 * it would zoom the map instead. `cooperative` scrolls the page on one finger / a plain wheel and
 * moves the map on two fingers / ctrl+wheel, and Google draws the hint itself.
 */
const Map = (props: MapProps) => {
  const { className, label, location, theme, variant = 'default' } = props;

  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: '100% 0px', once: true });
  const point = resolveMapLocation(location);

  if (!point) {
    return null;
  }

  const center = { lat: point.lat, lng: point.lng };

  return (
    <div ref={ref} aria-label={label} className={classNames(styles.map, className)} role="region">
      {inView && API_KEY && (
        <APIProvider apiKey={API_KEY}>
          <GoogleMap
            className={styles.canvas}
            colorScheme={theme === 'dark' ? 'DARK' : 'LIGHT'}
            defaultCenter={center}
            defaultZoom={point.zoom}
            disableDefaultUI={variant === 'compact'}
            gestureHandling="cooperative"
            mapId={MAP_ID}
          >
            <AdvancedMarker position={center} title={label} />
          </GoogleMap>
        </APIProvider>
      )}
    </div>
  );
};

export default Map;
