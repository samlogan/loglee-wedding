import type { FC } from 'react';

import Map from '@/components/Map';
import Section from '@/components/Section';
import classNames from '@/helpers/classNames';
import { resolveMapLocation } from '@/helpers/mapLocation';
import stringClean from '@/helpers/stringClean';
import { getSectionSpacingProps, getSectionTheme } from '@/tools/helpers/section';
import type { IMapSection } from '@/tools/sanity/schema/sections/mapSection';

import styles from './styles.module.scss';

/**
 * A full-bleed live map of one place, edge to edge of the viewport.
 *
 * The shape is the editor's: one aspect ratio for desktop and one for mobile, either of which can be
 * "full screen" — the height of the viewport. Both are applied as classes and switched in CSS, so the
 * server render already has the right box and nothing shifts when the map loads into it.
 *
 * No location, no section: an empty band of padding is worse than nothing.
 */
const MapSection: FC<IMapSection> = (props) => {
  const { aspectRatioDesktop, aspectRatioMobile, label, location } = props;

  if (!resolveMapLocation(location)) {
    return null;
  }

  const theme = getSectionTheme(props, 'light');
  // `stringClean`, because in draft mode a stega payload rides on every string — including these.
  const desktop = stringClean(aspectRatioDesktop ?? '') || '21x9';
  const mobile = stringClean(aspectRatioMobile ?? '') || '4x5';
  const place = stringClean(label ?? '').trim();

  return (
    <Section full name="MapSection" theme={theme} {...getSectionSpacingProps(props)}>
      <div className={classNames(styles.frame, styles[`desktop_${desktop}`], styles[`mobile_${mobile}`])}>
        <Map label={place ? `Map of ${place}` : 'Map'} location={location} theme={theme} />
      </div>
    </Section>
  );
};

export default MapSection;
