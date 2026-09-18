import type { Ref } from 'react';

import Link from '@/components/Link';
import classNames from '@/helpers/classNames';
import type { RsvpAction } from '@/helpers/rsvpAction';
import { isCurrent } from '@/tools/helpers/link';
import type { IHeaderObject } from '@/tools/sanity/schema/objects/header';

import styles from './styles.module.scss';

export interface HeaderNavigationMobileProps {
  className?: string;
  /** Matches the toggle's `aria-controls`. */
  id?: string;
  open?: boolean;
  navItems?: IHeaderObject['navItems'];
  pathname?: string;
  /**
   * The RSVP action exactly as the bar resolved it, so the pill and this panel draw one decision
   * rather than two. It used to arrive as the raw button plus the reply-by line and be combined again
   * here, with its own copy of the fallback.
   */
  action?: RsvpAction;
  /** React 19 ref-as-prop. The header focuses the panel itself when the menu opens. */
  ref?: Ref<HTMLDivElement>;
}

/**
 * The panel the hamburger discloses: the same five links stacked, and the RSVP action full width
 * beneath them.
 *
 * No frame anywhere in the Figma file draws this state — not the design system board (node 1:968),
 * which the ticket claimed had it and which in fact draws only the two *closed* bars, and not any
 * page frame; confirmed by walking all 1568 nodes over the REST API. So the panel is composed from
 * the vocabulary the rest of the design uses — the off-white surface, ink type, a hairline between
 * rows and never after the last, and the 4px-radius accent UI pill for the action — rather than
 * invented. Every value here traces to a token the drawn frames do use.
 *
 * Closed, it is hidden two ways on purpose. `visibility: hidden` takes it out of the tab order and
 * the accessibility tree while still allowing the opacity transition (unlike `display: none`), and
 * `inert` states the same thing in markup so it survives a stylesheet that fails to load and is
 * visible to the header's focus trap, which reads `[inert]` to decide what is reachable. There is
 * no sr-only utility in this project and nothing here needs one.
 */
const HeaderNavigationMobile = (props: HeaderNavigationMobileProps) => {
  const { action, className, id, navItems, open = false, pathname = '', ref } = props;

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
                    // A row is a full-width target. The prop rather than `width: 100%` in the
                    // stylesheet: the shared base sets no width, so `.fullWidth` wins with nothing
                    // to out-specify.
                    fullWidth
                  >
                    {navItem?.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      {/* The reply-by line has room here, so the menu shows the long form. */}
      {action && (
        <Link
          {...action.link}
          arrow="right"
          className={styles.action}
          fullWidth
          mono
          size="md"
          theme="accent"
          variant="ui"
        >
          {action.longLabel}
        </Link>
      )}
    </div>
  );
};

export default HeaderNavigationMobile;
