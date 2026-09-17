'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import classNames from '@/helpers/classNames';

import Link from '../../Link';
import Text from '../../Text';

import styles from './styles.module.scss';

interface NavigationTabsProps {
  tabs?: string[];
  className?: string;
  path: string;
  view?: string;
  current?: string;
  param?: string;
}

const NavigationTabs = (props: NavigationTabsProps) => {
  const { tabs, className, path, current, param = 'view' } = props;
  const classes = classNames(styles.tabs, className);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const isValid = tabs?.find((tab) => tab.toLowerCase() === current);
    if (!isValid) {
      router.replace(`${pathname}?${param}=${tabs?.[0].toLowerCase()}`);
    }
  }, [tabs, current, pathname, router, param]);

  if (!tabs) {
    return null;
  }

  return (
    <div className={classes} role="tablist">
      {tabs?.map((tab) => {
        const value = tab.toLowerCase();
        const isCurrent = current === value;
        const tabClasses = classNames(styles.tab, { [styles.active]: isCurrent });
        return (
          <Link
            className={tabClasses}
            key={tab}
            href={`${path}?${param}=${value}`}
            color="primary"
            size="lg"
            role="tab"
            aria-selected={isCurrent}
          >
            <Text text={tab} />
          </Link>
        );
      })}
    </div>
  );
};

export default NavigationTabs;
