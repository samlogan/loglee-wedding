import { describe, expect, it } from 'vitest';

import { DEFAULT_MAP_ZOOM, getMapsUrl, resolveMapLocation } from './mapLocation';

describe('resolveMapLocation', () => {
  it('is undefined for the shapes an unset or cleared geopoint projects as', () => {
    expect(resolveMapLocation(undefined)).toBeUndefined();
    expect(resolveMapLocation(null)).toBeUndefined();
    expect(resolveMapLocation({ lat: null, lng: null })).toBeUndefined();
    expect(resolveMapLocation({ lat: -34.6, lng: null })).toBeUndefined();
  });

  it('treats zero as a coordinate, not as missing', () => {
    expect(resolveMapLocation({ lat: 0, lng: 0 })).toEqual({ lat: 0, lng: 0, zoom: DEFAULT_MAP_ZOOM });
  });

  it('keeps the zoom the editor saved and falls back when there is none', () => {
    expect(resolveMapLocation({ lat: -34.6, lng: 150.7, zoom: 11 })?.zoom).toBe(11);
    expect(resolveMapLocation({ lat: -34.6, lng: 150.7, zoom: null })?.zoom).toBe(DEFAULT_MAP_ZOOM);
  });
});

describe('getMapsUrl', () => {
  it('builds a Google Maps search URL for the point', () => {
    expect(getMapsUrl({ lat: -34.656, lng: 150.745 })).toBe(
      'https://www.google.com/maps/search/?api=1&query=-34.656,150.745'
    );
  });

  it('is undefined when there is no point', () => {
    expect(getMapsUrl({ lat: null, lng: 150.745 })).toBeUndefined();
  });
});
