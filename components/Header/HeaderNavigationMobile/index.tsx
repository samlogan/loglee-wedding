import type { Ref } from 'react';

import Link from '@/components/Link';
import classNames from '@/helpers/classNames';
import { isCurrent } from '@/tools/helpers/link';
import type { IButtonElement } from '@/tools/sanity/schema/elements/button';
import type { IHeaderObject } from '@/tools/sanity/schema/objects/header';

import styles from './styles.module.scss';

export interface HeaderNavigationMobileProps {
  className?: string;
  /** Matches the toggle's `aria-controls`. */
  id?: string;
  open?: boolean;
  navItems?: IHeaderObject['navItems'];
  pathname?: string;
  /** `weddingSettings.rsvpLabel` — the full "reply by" line, which has room to sit here. */
  rsvpLabel?: string | null;
  button?: IButtonElement;
  /** React 19 ref-as-prop. The header focuses the panel itself when the menu opens. */
  ref?: Ref<HTMLDivElement>;
}

/**
 * The panel the hamburger discloses: the same five links stacked, and the RSVP action full width
 * beneath them.
 *
 * The design system board (Figma node 1:968) draws the closed mobile bar and the button set but
 * **not** the open menu, so the panel is composed from the vocabulary the rest of the design uses
 * — the off-white surface, a hairline between rows, and the accent UI pill for the action — rather
 * than invented.
 *
 * Closed, it is hidden two ways on purpose. `visibility: hidden` takes it out of the tab order and
 * the accessibility tree while still allowing the opacity transition (unlike `display: none`), and
 * `inert` states the same thing in markup so it survives a stylesheet that fails to load and is
 * visible to the header's focus trap, which reads `[inert]` to decide what is reachable. There is
 * no sr-only utility in this project and nothing here needs one.
 */
const HeaderNavigationMobile = (props: HeaderNavigationMobileProps) => {
  const { button, className, id, navItems, open = false, pathname = '', ref, rsvpLabel } = props;

  // The reply-by line has room here, so the menu shows the long form. Gated on the action itself
  // for the same reason the bar's pill is: a label with nowhere to go is not a control.
  const actionLabel = button && (rsvpLabel || button.label);

  return (
    <div
      className={classNames(styles.panel, { [styles.open]: open }, className)}
      id={id}
      /*
       * A boolean attribute in React 19 — `inert={false}` omits it rather than writing
       * `inert="false"`, which the older string form would have made truthy and permanently inert.
       */
      inert={!open}
      ref={ref}
      /* Focused when the menu opens, so the next Tab lands on the first link rather than back at
       * the top of the page. Not in the tab order itself: -1 is excluded by the trap's selector. */
      tabIndex={-1}
    >
      {!!navItems?.length && (
        <nav aria-label="Primary" className={styles.navigation}>
          <ul className={styles.list}>
            {navItems.map((navItem, index) => {
              const current = isCurrent(pathname, navItem?.link);
              return (
                <li className={styles.item} key={navItem?._key ?? index}>
                  <Link
                    {...navItem?.link}
                    aria-current={current ? 'page' : undefined}
                    className={classNames(styles.link, { [styles.current]: current })}
                  >
                    {navItem?.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      {!!actionLabel && (
        <Link
          {...button?.link}
          arrow="right"
          className={styles.action}
          fullWidth
          mono
          size="md"
          theme="accent"
          variant="ui"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
};

export default HeaderNavigationMobile;
