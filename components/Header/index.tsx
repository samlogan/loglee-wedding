'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

import Container from '@/components/Container';
import Logo from '@/components/Logo';
import classNames from '@/helpers/classNames';
import useElementHeight from '@/tools/hooks/useElementHeight';
import type { IHeaderDocument } from '@/tools/sanity/schema/documents/headerDocument';

import HeaderNavigationDesktop from './HeaderNavigationDesktop';
import HeaderNavigationMobile from './HeaderNavigationMobile';
import useHeaderState from './hooks/useHeaderState';

import styles from './styles.module.scss';

interface HeaderProps extends IHeaderDocument {
  className?: string;
}

const Header = (props: HeaderProps) => {
  const { className, header } = props;
  const pathname = usePathname();
  const { mobileNavOpen, setMobileNavOpen, hidden, atTop } = useHeaderState();
  const classes = classNames(styles.header, { [styles.hidden]: hidden }, { [styles.atTop]: atTop }, className);

  const isStudio = pathname?.startsWith('/studio');

  // Calculate header height and set as a css variable on the root element named --header-height
  // Update this value on resize
  const [headerRef, headerHeight] = useElementHeight({});
  useEffect(() => {
    document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
  }, [headerHeight]);

  // Close mobile nav when navigating to a new page
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname, setMobileNavOpen]);

  if (isStudio) {
    return null;
  }

  return (
    <>
      <header className={classes} ref={headerRef} data-theme="light">
        <Container className={styles.container}>
          <div>
            <Logo className={styles.logo} />
          </div>
          <HeaderNavigationDesktop header={header} className={styles.headerNavDesktop} />
          <HeaderNavigationMobile header={header} className={styles.headerNavMobile} open={mobileNavOpen} />

          <button
            aria-label="Open mobile navigation"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className={classNames(styles.mobileNavToggle, { [styles.active]: mobileNavOpen })}
          >
            <span />
            <span />
            <span />
          </button>
        </Container>
      </header>
      <a id="content" tabIndex={-1} />
    </>
  );
};

export default Header;
