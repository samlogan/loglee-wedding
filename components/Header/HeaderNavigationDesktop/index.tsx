'use client';

import { usePathname } from 'next/navigation';
import { useState, useRef } from 'react';
import type { KeyboardEvent } from 'react';

import Icon from '@/components/Icon';
import Link from '@/components/Link';
import Text from '@/components/Text';
import classNames from '@/helpers/classNames';
import { isCurrent } from '@/tools/helpers/link';
import type { IHeaderObject } from '@/tools/sanity/schema/objects/header';

import styles from './styles.module.scss';

interface HeaderNavigationDesktopProps {
  className?: string;
  header?: IHeaderObject;
}

const HeaderNavigationDesktop = ({ className, header }: HeaderNavigationDesktopProps) => {
  const { navItems, addButton, button, addSecondaryButton, secondaryButton } = header || {};
  const pathname = usePathname();
  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null);

  return (
    <nav className={classNames(styles.navigation, className)}>
      {navItems?.map((navItem, index) => (
        <NavItem
          key={index}
          index={index}
          navItem={navItem}
          pathname={pathname}
          openDropdownIndex={openDropdownIndex}
          setOpenDropdownIndex={setOpenDropdownIndex}
        />
      ))}

      {(addButton || addSecondaryButton) && (
        <div className={styles.buttons}>
          {addButton && (
            <Link {...button?.link} className={styles.button} title={button?.label} size="md" theme="primary">
              <Text text={button?.label} weight="medium" />
            </Link>
          )}
          {addSecondaryButton && (
            <Link
              {...secondaryButton?.link}
              className={styles.button}
              title={secondaryButton?.label}
              size="md"
              theme="secondary"
            >
              <Text text={secondaryButton?.label} weight="medium" />
            </Link>
          )}
        </div>
      )}
    </nav>
  );
};

interface NavItemProps {
  navItem: IHeaderObject['navItems'][0];
  pathname: string;
  index: number;
  openDropdownIndex: number | null;
  setOpenDropdownIndex: (index: number | null) => void;
}

const NavItem = ({ navItem, pathname, index, openDropdownIndex, setOpenDropdownIndex }: NavItemProps) => {
  const isActive =
    isCurrent(pathname, navItem?.link) ||
    (navItem.dropdown && navItem.navSublinks.some((sublink) => isCurrent(pathname, sublink?.link)));
  const isOpen = openDropdownIndex === index;
  const hasDropdown = !!navItem.dropdown;
  const navItemRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (event: KeyboardEvent<HTMLAnchorElement>) => {
    if (hasDropdown) {
      if (event.key === 'Enter' || event.key === 'ArrowDown') {
        event.preventDefault();
        setOpenDropdownIndex(isOpen ? null : index);
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpenDropdownIndex(null);
        navItemRef.current?.querySelector('a')?.focus(); // Return focus to parent link
      }
    }
  };

  // Close dropdown when tabbing past it
  const handleBlur = () => {
    requestAnimationFrame(() => {
      if (!navItemRef.current?.contains(document.activeElement)) {
        setOpenDropdownIndex(null);
      }
    });
  };

  return (
    <div
      className={classNames(styles.navItem, { [styles.isOpen]: isOpen })}
      ref={navItemRef}
      onMouseEnter={() => setOpenDropdownIndex(index)}
      onMouseLeave={() => setOpenDropdownIndex(null)}
      onBlur={handleBlur}
    >
      <Link
        {...navItem.link}
        className={styles.navLink}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        forceLinkWhenEmpty
        title={navItem.title}
        aria-haspopup={hasDropdown ? 'true' : 'false'}
        aria-expanded={isOpen}
      >
        <span className={classNames(styles.navLinkTitle, { [styles.current]: isActive })}>{navItem.title}</span>
        {hasDropdown && <Icon title="chevronDown" size="md" className={styles.chevron} />}
      </Link>
      {hasDropdown && <Dropdown navItem={navItem} isOpen={isOpen} closeDropdown={() => setOpenDropdownIndex(null)} />}
    </div>
  );
};

const Dropdown = ({
  navItem,
  isOpen,
  closeDropdown
}: {
  navItem: IHeaderObject['navItems'][0];
  isOpen: boolean;
  closeDropdown: () => void;
}) => {
  const isDoubleColumnsDropdown = navItem.dropdown && navItem.navSublinks.length > 4;
  const pathname = usePathname();

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeDropdown();
      event.currentTarget.closest(`.${styles.navItem}`)?.querySelector('a')?.focus(); // Return focus to parent link
    }
  };

  return (
    <div
      className={styles.wrapper}
      tabIndex={-1} // Prevent focus when closed
      aria-hidden={!isOpen} // Hide from screen readers when closed
      onKeyDown={handleKeyDown}
    >
      <div
        data-theme="light"
        className={classNames(styles.dropdown, { [styles.dropdownDoubleColumns]: isDoubleColumnsDropdown })}
      >
        {navItem.navSublinks.map((sublink, index) => (
          <Link
            key={index}
            {...sublink.link}
            className={classNames(styles.subNavLink, { [styles.current]: isCurrent(pathname, sublink?.link) })}
            tabIndex={isOpen ? 0 : -1} // Only focusable when dropdown is open
            title={sublink.title}
          >
            {sublink.title}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default HeaderNavigationDesktop;
