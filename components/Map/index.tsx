'use client';

import { AdvancedMarker, APIProvider, ControlPosition, Map as GoogleMap, Marker, Pin } from '@vis.gl/react-google-maps';
import { useInView } from 'motion/react';
import { useRef } from 'react';

import classNames from '@/helpers/classNames';
import { resolveMapLocation } from '@/helpers/mapLocation';
import type { MapLocation } from '@/helpers/mapLocation';

import { mapStyle, pinSvg, readToken } from './mapStyle';

import styles from './styles.module.scss';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

/*
 * ## Two ways to style the map, and Google allows only one at a time
 *
 * A map with a **map ID** is styled in the Cloud console and can use `AdvancedMarker`; Google refuses
 * a JSON `styles` array on it outright. A map **without** one takes the JSON style — `mapStyle.ts`,
 * the site's own stone and pine — but not `AdvancedMarker`, so its pin is the legacy `Marker`.
 *
 * With no `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` set, which is the default, the map uses the JSON style:
 * it matches the site with nothing to configure outside the repo. Set a map ID and the Cloud style
 * takes over, with an `AdvancedMarker` pin in the same colours — at which point the look is the
 * Cloud style's to match.
 *
 * `google.maps.Marker` is deprecated in favour of `AdvancedMarker`, but Google has announced no
 * removal date and commits to twelve months' notice; the console notes the deprecation once per load.
 */
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;

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
/**
 * The legacy marker with the site's pin. Its icon needs `google.maps.Size` and `Point`, which exist
 * only once the API has loaded — true by the time the map renders its children.
 */
const VenueMarker = (props: { position: google.maps.LatLngLiteral; theme?: ProjectTheme; title: string }) => {
  const { position, theme, title } = props;

  return (
    <Marker
      icon={{
        anchor: new google.maps.Point(16, 43),
        scaledSize: new google.maps.Size(32, 44),
        url: pinSvg(theme)
      }}
      position={position}
      title={title}
    />
  );
};

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
            // Business and landmark pins are hidden by the style; this stops the ones Google still
            // draws from opening an info window over the venue.
            clickableIcons={false}
            colorScheme={theme === 'dark' ? 'DARK' : 'LIGHT'}
            defaultCenter={center}
            defaultZoom={point.zoom}
            // Only zoom, and only on the full-size map: map/satellite, Street View and fullscreen
            // are Google's chrome rather than anything a guest finding the venue needs.
            disableDefaultUI
            gestureHandling="cooperative"
            mapId={MAP_ID}
            styles={MAP_ID ? undefined : mapStyle(theme)}
            zoomControl={variant === 'default'}
            // Top right, clear of the chip at top left and of the address bar along the bottom that
            // `MapCard` lays over the map.
            zoomControlOptions={{ position: ControlPosition.RIGHT_TOP }}
          >
            {MAP_ID ? (
              <AdvancedMarker position={center} title={label}>
                <Pin
                  background={readToken(theme === 'dark' ? 'stone-50' : 'stone-900')}
                  borderColor={readToken(theme === 'dark' ? 'pine-600' : 'stone-50')}
                  glyphColor={readToken(theme === 'dark' ? 'pine-600' : 'stone-50')}
                />
              </AdvancedMarker>
            ) : (
              <VenueMarker position={center} theme={theme} title={label} />
            )}
          </GoogleMap>
        </APIProvider>
      )}
    </div>
  );
};

export default Map;
