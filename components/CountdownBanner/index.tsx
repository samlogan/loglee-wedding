'use client';

import { useSyncExternalStore } from 'react';

import Container from '@/components/Container';
import Text from '@/components/Text';
import classNames from '@/helpers/classNames';
import { WEDDING_COUNTDOWN_TARGET, countdownParts } from '@/helpers/countdown';
import type { CountdownParts } from '@/helpers/countdown';

import styles from './styles.module.scss';

export interface CountdownBannerProps {
  className?: string;
  /** An ISO instant with its offset. Defaults to 3pm Friday 12 February 2027, Sydney time. */
  target?: string;
  /** Shown instead of the numbers once the moment has passed. */
  arrivedLabel?: string;
}

/*
 * The clock, as an external store read through `useSyncExternalStore` rather than a `setState` in an
 * effect. The snapshot is the current whole second, a primitive, so React sees it change once a
 * second and not on every read. The server snapshot is `null`: the server cannot know the time the
 * page will be read at, and a rendered count would be stale by the time it arrived and mismatch
 * hydration besides.
 */
const subscribe = (onTick: () => void) => {
  const id = window.setInterval(onTick, 1000);
  return () => window.clearInterval(id);
};
const getSecond = () => Math.floor(Date.now() / 1000);
const getServerSecond = () => null;

const pad = (value: number) => String(value).padStart(2, '0');

/** "146 days · 04 hrs · 12 min · 30 sec" — the units in words, so a screen reader says them. */
const formatParts = ({ days, hours, minutes, seconds }: CountdownParts) =>
  `${days} ${days === 1 ? 'day' : 'days'} · ${pad(hours)} hrs · ${pad(minutes)} min · ${pad(seconds)} sec`;

/**
 * A slim band above the site header counting down to the start of the wedding weekend.
 *
 * ## Why it sits above the header, in the flow
 *
 * The header is `position: sticky; top: 0`. With this band before it in the document, the band
 * scrolls away with the page and the header then sticks at the top as it always has — nothing about
 * the header's own hide-on-scroll behaviour has to know the band exists.
 *
 * ## Nothing jumps when the numbers arrive
 *
 * The server renders a placeholder the same length as a real count, hidden, so the band's height and
 * its line breaks are the same before and after hydration.
 *
 * ## Not a live region
 *
 * It changes every second. Announced, it would talk over everything else on the page. It is a plain
 * landmark a screen-reader user can visit and read at the moment they choose.
 */
const CountdownBanner = (props: CountdownBannerProps) => {
  const { arrivedLabel = "It's wedding weekend", className, target = WEDDING_COUNTDOWN_TARGET } = props;

  const second = useSyncExternalStore(subscribe, getSecond, getServerSecond);
  const parts = second === null ? undefined : countdownParts(Date.parse(target), second * 1000);
  const arrived = parts === null;

  return (
    <aside aria-label="Countdown to the wedding" className={classNames(styles.banner, className)} data-theme="dark">
      <Container className={styles.inner} width="xl">
        {arrived ? (
          <Text as="p" size="xs" text={arrivedLabel} textTransform="uppercase" variant="mono" weight="bold" />
        ) : (
          <Text
            ariaHidden={!parts}
            as="p"
            className={classNames(styles.count, { [styles.pending]: !parts })}
            size="xs"
            text={parts ? formatParts(parts) : formatParts({ days: 100, hours: 0, minutes: 0, seconds: 0 })}
            textTransform="uppercase"
            variant="mono"
            weight="bold"
          />
        )}
      </Container>
    </aside>
  );
};

export default CountdownBanner;
