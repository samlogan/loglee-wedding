'use client';

import { usePathname } from 'next/navigation';
import { useId, useRef } from 'react';

import Container from '@/components/Container';
import Link from '@/components/Link';
import Logo from '@/components/Logo';
import classNames from '@/helpers/classNames';
import resolveRsvpAction from '@/helpers/rsvpAction';
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
   * `weddingSettings.rsvpLabel` — the "RSVP by 11 December" line. The pill reads the action's own
   * label ("RSVP") and falls back to this only when that is blank; see `tools/helpers/rsvpAction`.
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

  const menuId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  /*
   * The bar itself — the focus trap's container, and the element `useHeaderState` watches to know
   * when the layout has crossed the switch.
   *
   * It used to come from `useElementHeight`, which existed only to publish the bar's height as
   * `--header-height` for the mobile panel to size itself against. The panel now says
   * `calc(100dvh - 100%)` instead, which layout re-resolves on its own; see the note there for the
   * three ways the measured version was wrong.
   */
  const headerRef = useRef<HTMLElement>(null);
  const { menuOpen, toggleMenu, closeMenu, hidden } = useHeaderState(headerRef);

  useFocusTrap({
    active: menuOpen,
    containerRef: headerRef,
    initialFocusRef: panelRef,
    onEscape: closeMenu,
    returnFocusRef: toggleRef
  });

  /*
   * The action and both of its labels, resolved by `tools/helpers/rsvpAction` — the same helper
   * `sections/ClosingCtaSection` reads, so the bar, the menu and the home page's RSVP button cannot
   * combine these fields three different ways. The rules (the switch, each label falling back to the
   * other, no label no pill) are documented there. Undefined when there is nothing to draw: the pill is
   * the header's *action*, so it needs one, and a reply-by line with nowhere to go would render as
   * `Link`'s inert `<span>` — correct, and still a lime pill that does nothing.
   *
   * Two labels, one control, and the split is the design's.
   *
   * Desktop has room for the whole "RSVP by 01.12.26" line and the ticket asks for it there; the
   * 390px bar does not, and Figma draws a bare "RSVP" pill beside the hamburger (node 1:107). Both
   * strings come from the CMS — only the *date* has a single home, which is the part that could
   * drift. Each span is `display: none` at the width it is not wanted, which removes it from the
   * accessible name as well as from the page, so the control announces exactly what it reads.
   *
   * Two known, deliberate departures from the nav frames, both recorded here so they read as
   * decisions rather than misses:
   *
   * - Figma's *desktop* nav pill is a bare "RSVP →" at 80×38 (node 1:61); the reply-by line appears
   *   in the bar only on the RSVP page, and there as quiet pine text rather than a pill (node
   *   1:753). MAM-1887 asks for the reply-by label on the action, so the pill carries it and grows
   *   to ~178px. That width is *the* reason the switch is at 900px — re-derive it if the label ever
   *   goes back to "RSVP →".
   * - Figma's *mobile* pill has no arrow (nodes 1:107, 1:1018); this one does, because `arrow` is a
   *   prop on a single element rendered at both widths and the alternative is a stylesheet here
   *   reaching into `Button`'s markup to hide it. The arrow is `aria-hidden` decoration, it costs
   *   ~15px on a bar with ~100px of slack at 375px, and it keeps one affordance at both widths.
   */
  const action = resolveRsvpAction({ addButton, button, rsvpLabel });
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
            {action && (
              <Link {...action.link} arrow="right" className={styles.action} mono size="sm" theme="accent" variant="ui">
                {action.label}
              </Link>
            )}

            {hasMenu && (
              <button
                aria-controls={menuId}
                aria-expanded={menuOpen}
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                className={classNames(styles.toggle, { [styles.toggle_open]: menuOpen })}
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
            action={action}
            id={menuId}
            navItems={navItems}
            open={menuOpen}
            pathname={pathname}
            ref={panelRef}
          />
        )}
      </header>
      <a id="content" tabIndex={-1} />
    </>
  );
};

export default Header;
