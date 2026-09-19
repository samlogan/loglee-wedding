/**
 * A Sanity `geopoint` as a projection returns it.
 *
 * Every leaf is nullable because an editor can open the field and clear it, which leaves a shaped
 * object with null coordinates behind. `zoom` is only present because the Studio plugin is
 * registered with `saveZoom: true` — the editor frames the map once, in the picker, and the site
 * reuses that framing rather than asking for a second number.
 */
export interface MapLocation {
  lat?: number | null;
  lng?: number | null;
  zoom?: number | null;
}

export interface ResolvedMapLocation {
  lat: number;
  lng: number;
  zoom: number;
}

/** Street level with the surrounding roads legible — what a guest wants from "where is it?". */
export const DEFAULT_MAP_ZOOM = 15;

/**
 * The location with its zoom filled in, or `undefined` when there is nothing to put on a map.
 *
 * `Number.isFinite` rather than a truthiness test, because `0` is a real latitude and a real
 * longitude.
 */
export const resolveMapLocation = (location?: MapLocation | null): ResolvedMapLocation | undefined => {
  const { lat, lng, zoom } = location ?? {};

  if (!(Number.isFinite(lat) && Number.isFinite(lng))) {
    return undefined;
  }

  return {
    lat: lat as number,
    lng: lng as number,
    zoom: Number.isFinite(zoom) ? (zoom as number) : DEFAULT_MAP_ZOOM
  };
};

/**
 * A universal Google Maps URL for the point — opens the app on a phone and the site on a desktop.
 *
 * https://developers.google.com/maps/documentation/urls/get-started#search-action
 */
export const getMapsUrl = (location?: MapLocation | null): string | undefined => {
  const resolved = resolveMapLocation(location);

  return resolved ? `https://www.google.com/maps/search/?api=1&query=${resolved.lat},${resolved.lng}` : undefined;
};
