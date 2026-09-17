'use client';

import { usePathname } from 'next/navigation';
import type { FC } from 'react';
import { useEffect } from 'react';

import Link from '@/components/Link';

import styles from './styles.module.scss';

const AccessibilityMenu: FC = () => {
  const pathname = usePathname();

  // Move focus to the top of the page on route changes
  useEffect(() => {
    const topId = document.querySelector('#top');
    if (topId) {
      topId.setAttribute('tabIndex', '-1'); // Ensure it's focusable
      (topId as HTMLElement).focus();
    }
  }, [pathname]);

  const pathIsHome = pathname === '/';

  const skipLinks = [
    { href: pathIsHome ? '#home' : '/', label: 'Home', useNextLink: !pathIsHome },
    { href: '#content', label: 'Content' },
    { href: '#footer', label: 'Footer navigation' }
  ];

  return (
    <>
      {/* Invisible focus target at the very top of the page */}
      <a id="top" aria-live="polite" />

      <div className={styles.accessibilityMenu}>
        <span className={styles.label}>Skip to:</span>
        <nav>
          <ul>
            {skipLinks.map((link) => {
              const LinkElement = link.useNextLink ? Link : 'a';
              return (
                <li key={link.href}>
                  <LinkElement href={link.href} className={styles.link} title={`Skip to ${link.label}`}>
                    {link.label}
                  </LinkElement>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </>
  );
};

export default AccessibilityMenu;
