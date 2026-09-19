import type { FC } from 'react';

import AspectRatioFrame from '@/components/AspectRatioFrame';
import Map from '@/components/Map';
import Section from '@/components/Section';
import { resolveMapLocation } from '@/helpers/mapLocation';
import stringClean from '@/helpers/stringClean';
import { getSectionSpacingProps, getSectionTheme } from '@/tools/helpers/section';
import type { IMapSection } from '@/tools/sanity/schema/sections/mapSection';

/**
 * A full-bleed live map of one place, edge to edge of the viewport.
 *
 * The shape is the editor's: one aspect ratio for desktop and one for mobile, either of which can be
 * "full screen" — the height of the viewport. `AspectRatioFrame` owns that, shared with
 * `MediaSection`.
 *
 * No location, no section: an empty band of padding is worse than nothing.
 */
const MapSection: FC<IMapSection> = (props) => {
  const { aspectRatioDesktop, aspectRatioMobile, label, location } = props;

  if (!resolveMapLocation(location)) {
    return null;
  }

  const theme = getSectionTheme(props, 'light');
  // `stringClean`, because in draft mode a stega payload rides on every string.
  const place = stringClean(label ?? '').trim();

  return (
    <Section full name="MapSection" theme={theme} {...getSectionSpacingProps(props)}>
      <AspectRatioFrame desktop={aspectRatioDesktop} mobile={aspectRatioMobile}>
        <Map label={place ? `Map of ${place}` : 'Map'} location={location} theme={theme} />
      </AspectRatioFrame>
    </Section>
  );
};

export default MapSection;
