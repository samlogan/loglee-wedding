import type { FC } from 'react';

import AspectRatioFrame from '@/components/AspectRatioFrame';
import Container from '@/components/Container';
import MapCard from '@/components/MapCard';
import Section from '@/components/Section';
import TextBlock from '@/components/TextBlock';
import TextTitle from '@/components/TextTitle';
import classNames from '@/helpers/classNames';
import hasBlockContent from '@/helpers/hasBlockContent';
import hasTitleText from '@/helpers/hasTitleText';
import isContained from '@/helpers/isContained';
import { resolveMapLocation } from '@/helpers/mapLocation';
import stringClean from '@/helpers/stringClean';
import { getSectionSpacingProps, getSectionTheme } from '@/tools/helpers/section';
import type { IMapSection } from '@/tools/sanity/schema/sections/mapSection';

import styles from './styles.module.scss';

/**
 * A live map of one place with the FAQ card's corner chip and "Open in maps" bar over it — `MapCard`
 * in its `fill` mode. Full width (edge to edge of the viewport, the default) or contained (inside the
 * page container, in the Select Player section's dashed panel) — the `width` field.
 *
 * The shape is the editor's: one aspect ratio for desktop and one for mobile, either of which can be
 * "full screen" — the height of the viewport. `AspectRatioFrame` owns that, shared with
 * `MediaSection`.
 *
 * No location, no section: an empty band of padding is worse than nothing.
 */
const MapSection: FC<IMapSection> = (props) => {
  const { address, aspectRatioDesktop, aspectRatioMobile, badge, content, label, link, location, title, width } = props;

  if (!resolveMapLocation(location)) {
    return null;
  }

  const theme = getSectionTheme(props, 'light');
  const contained = isContained(width);

  /*
   * `hasTitleText` because `TitleInput` stores markup — an emptied title is the truthy `'<h2></h2>'` —
   * and `hasBlockContent` because a cleared rich-text field leaves one empty block behind.
   */
  const hasTitle = hasTitleText(title);
  const hasContent = hasBlockContent(content);
  const header = (hasTitle || hasContent) && (
    <div className={styles.header}>
      {/*
       * The site's section-title treatment — Archivo Black in capitals, at the size the dress-code
       * band's "WHAT TO WEAR" is set (`TwoColumnListSection`'s `.title`); see `.title` in the
       * stylesheet. `h2` forced, as the other sections force it: the page's outline is the page's.
       */}
      {hasTitle && (
        <TextTitle
          as="h2"
          className={styles.title}
          size="md"
          textTransform="uppercase"
          title={title ?? undefined}
          variant="display"
        />
      )}
      {hasContent && (
        <TextBlock blocks={content ?? undefined} className={styles.content} config={{ p: { size: 'lg' } }} />
      )}
    </div>
  );
  // `label` is the field `address` replaced; read only while the new one is empty. `stringClean`
  // on the test, because in draft mode a stega payload makes a blank string non-empty.
  const shownAddress = stringClean(address ?? '').trim() ? address : label;
  /*
   * "Open in maps" is always offered on a large map — it is the one thing a guest looking at a
   * map of the venue most wants next. An editor's label wins; with none, the default has no URL, so
   * `MapCard` points it at the pin.
   */
  const mapsLink = link?.label?.trim() ? link : { label: 'Open in maps', link: link?.link ?? {} };

  return (
    <Section full={!contained} name="MapSection" theme={theme} {...getSectionSpacingProps(props)}>
      {/*
       * The heading always sits on the page's grid. A contained section is already inside
       * `Section`'s container; a full-width one has none, so the header brings its own.
       */}
      {header && (contained ? header : <Container>{header}</Container>)}
      <AspectRatioFrame
        className={classNames({ [styles.panel]: contained })}
        desktop={aspectRatioDesktop}
        mobile={aspectRatioMobile}
        rounded={contained}
      >
        <MapCard
          address={shownAddress}
          className={styles.map}
          badge={badge}
          fill={contained ? 'contained' : 'bleed'}
          link={mapsLink}
          location={location}
          theme={theme}
        />
      </AspectRatioFrame>
    </Section>
  );
};

export default MapSection;
