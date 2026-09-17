import Link from '@/components/Link';
import classNames from '@/helpers/classNames';
import { isCurrent } from '@/tools/helpers/link';
import type { IHeaderObject } from '@/tools/sanity/schema/objects/header';

import styles from './styles.module.scss';

export interface HeaderNavigationDesktopProps {
  className?: string;
  navItems?: IHeaderObject['navItems'];
  /** Passed in rather than read from `usePathname` so the bar and both navs agree on one value. */
  pathname?: string;
}

/**
 * The inline link list in the middle of the bar.
 *
 * Flat, by design: five links, no dropdowns (Figma node 1:48). The dropdown branch this component
 * used to carry is gone along with the schema fields behind it — see the note on `IHeaderObject`.
 * That also retires the `forceLinkWhenEmpty` call that rendered a dropdown parent as
 * `<a href="#" role="button">`: an anchor that claims the button role but cannot be activated with
 * Space, and whose click navigates to the fragment (WCAG 2.1.1, 4.1.2). Every item here is a link
 * that goes somewhere, or — if an editor leaves its destination blank — the inert `<span>` `Link`
 * falls back to, which announces as text rather than as a broken control.
 */
const HeaderNavigationDesktop = (props: HeaderNavigationDesktopProps) => {
  const { className, navItems, pathname = '' } = props;

  if (!navItems?.length) {
    return null;
  }

  return (
    <nav aria-label="Primary" className={classNames(styles.navigation, className)}>
      <ul className={styles.list}>
        {navItems.map((navItem, index) => {
          const current = isCurrent(pathname, navItem?.link);
          return (
            <li className={styles.item} key={navItem?._key ?? index}>
              <Link
                {...navItem?.link}
                /*
                 * The machine-readable half of "you are here". The underline below is the other
                 * half; neither stands alone — colour and weight alone would fail WCAG 1.4.1, and
                 * an underline alone says nothing to a screen reader.
                 */
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
  );
};

export default HeaderNavigationDesktop;
