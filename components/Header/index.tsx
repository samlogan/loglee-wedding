'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef } from 'react';

import Container from '@/components/Container';
import Link from '@/components/Link';
import Logo from '@/components/Logo';
import classNames from '@/helpers/classNames';
import useElementHeight from '@/tools/hooks/useElementHeight';
import type { IHeaderObject } from '@/tools/sanity/schema/objects/header';

import HeaderNavigationDesktop from './HeaderNavigationDesktop';
import HeaderNavigationMobile from './HeaderNavigationMobile';
import useFocusTrap from './hooks/useFocusTrap';
import useHeaderState from './hooks/useHeaderState';

import styles from './styles.module.scss';

export interface HeaderProps {
  className?: string;
  /** `headerDocument.header` — the five links and the RSVP action. */
  header?: IHeaderObject;
  /**
   * `weddingSettings.rsvpLabel` — the short "reply by 13 November" line.
   *
   * It lives on the wedding singleton rather than on the header document because the same date is
   * shown beside the RSVP action on the home page too, and one field cannot disagree with itself.
   * Blank is a supported state: the pill falls back to the action's own label, which is the
   * "RSVP →" the design draws.
   */
  rsvpLabel?: string | null;
}

/**
 * The site bar: wordmark and date lockup at the left, the links in the middle, the accent RSVP
 * pill at the right, and a hairline under the lot (Figma nodes 1:45 desktop, 1:103 mobile).
 *
 * Pinned to the light theme. Every page frame in the design draws the same off-white bar with
 * near-black ink regardless of what the page below it does, so this is a decision rather than an
 * omission — and it is still made entirely out of theme tokens, so it moves if the light theme
 * does.
 */
const Header = (props: HeaderProps) => {
  const { className, header, rsvpLabel } = props;
  const { navItems, addButton, button } = header || {};
  const pathname = usePathname();
  const { menuOpen, toggleMenu, closeMenu, hidden } = useHeaderState();

  const menuId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Publishes the bar's height as `--header-height` on the root element, re-measured on resize.
  // The mobile panel sizes itself against it, and so does anything else that has to clear the bar.
  const [headerRef, headerHeight] = useElementHeight({});
  useEffect(() => {
    document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
  }, [headerHeight]);

  useFocusTrap({
    active: menuOpen,
    containerRef: headerRef,
    initialFocusRef: panelRef,
    onEscape: closeMenu,
    returnFocusRef: toggleRef
  });

  const action = addButton ? button : undefined;
  /*
   * Two labels, one control, and the split is the design's.
   *
   * Desktop has room for the whole "RSVP by 01.12.26" line and the ticket asks for it there; the
   * 390px bar does not, and Figma draws a bare "RSVP" pill beside the hamburger (node 1:107). Both
   * strings come from the CMS — only the *date* has a single home, which is the part that could
   * drift. Each span is `display: none` at the width it is not wanted, which removes it from the
   * accessible name as well as from the page, so the control announces exactly what it reads.
   */
  const longLabel = rsvpLabel || action?.label;
  const shortLabel = action?.label || rsvpLabel;
  // The pill is the header's *action*, so it needs one. A reply-by line with nowhere to go would
  // render as `Link`'s inert `<span>` — correct, and still a lime pill that does nothing.
  const showAction = Boolean(action && longLabel);
  /*
   * No links, no disclosure. The action is already in the bar, so an empty nav list leaves the
   * panel with nothing in it — and a toggle that opens an empty sheet is worse than no toggle:
   * it announces `aria-expanded` state about content that does not exist, and traps focus in it.
   */
  const hasMenu = Boolean(navItems?.length);

  if (pathname?.startsWith('/studio')) {
    return null;
  }

  return (
    <>
      <header
        className={classNames(styles.header, { [styles.hidden]: hidden }, className)}
        data-theme="light"
        ref={headerRef}
      >
        <Container className={styles.bar} width="xl">
          <Logo className={styles.wordmark} />

          <HeaderNavigationDesktop navItems={navItems} pathname={pathname} />

          <div className={styles.actions}>
            {showAction && (
              <Link
                {...action?.link}
                arrow="right"
                className={styles.action}
                mono
                size="sm"
                theme="accent"
                variant="ui"
              >
                <span className={styles.actionLong}>{longLabel}</span>
                <span className={styles.actionShort}>{shortLabel}</span>
              </Link>
            )}

            {hasMenu && (
              <button
                aria-controls={menuId}
                aria-expanded={menuOpen}
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                className={classNames(styles.toggle, { [styles.toggleOpen]: menuOpen })}
                onClick={toggleMenu}
                ref={toggleRef}
                type="button"
              >
                <span />
                <span />
              </button>
            )}
          </div>
        </Container>

        {hasMenu && (
          <HeaderNavigationMobile
            button={action}
            id={menuId}
            navItems={navItems}
            open={menuOpen}
            pathname={pathname}
            ref={panelRef}
            rsvpLabel={rsvpLabel}
          />
        )}
      </header>
      <a id="content" tabIndex={-1} />
    </>
  );
};

export default Header;
