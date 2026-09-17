'use client';

import { usePathname } from 'next/navigation';

import Accordion from '@/components/Accordion';
import Link from '@/components/Link';
import Text from '@/components/Text';
import classNames from '@/helpers/classNames';
import { isCurrent } from '@/tools/helpers/link';
import type { IHeaderObject } from '@/tools/sanity/schema/objects/header';

import styles from './styles.module.scss';

interface HeaderNavigationMobileProps {
  className?: string;
  header?: IHeaderObject;
  open: boolean;
}

const HeaderNavigationMobile = (props: HeaderNavigationMobileProps) => {
  const { className, header, open } = props || {};
  const { navItems, addButton, button, addSecondaryButton, secondaryButton } = header || {};
  const pathname = usePathname();
  const classes = classNames(styles.container, { [styles.open]: !!open }, className);

  return (
    <div className={classes} data-theme="dark">
      <Accordion>
        {navItems?.map((item, index) => {
          const { title, link, dropdown, navSublinks } = item;
          const hasCurrentSublink = dropdown && navSublinks?.some((sublink) => isCurrent(pathname, sublink?.link));
          return (
            <Accordion.Item
              key={index}
              classNameTrigger={classNames(
                styles.dropdownTrigger,
                { [styles.noDropdown]: !dropdown },
                {
                  [styles.current]: isCurrent(pathname, link) || hasCurrentSublink
                }
              )}
              title={<Link {...link}>{title}</Link>}
            >
              {dropdown ? (
                <div className={styles.dropdownLinks}>
                  {navSublinks?.map((sublink, subindex) => (
                    <Link
                      {...sublink.link}
                      className={classNames(styles.dropdownLink, {
                        [styles.current]: isCurrent(pathname, sublink?.link)
                      })}
                      key={subindex}
                    >
                      {sublink.title}
                    </Link>
                  ))}
                </div>
              ) : null}
            </Accordion.Item>
          );
        })}
      </Accordion>
      {(addButton || addSecondaryButton) && (
        <div className={styles.buttonContainer}>
          {addButton && (
            <Link {...button?.link} className={styles.button} size="md" theme="primary">
              <Text text={button?.label} weight="medium" />
            </Link>
          )}
          {addSecondaryButton && (
            <Link {...secondaryButton?.link} className={styles.button} size="md" theme="secondary">
              <Text text={secondaryButton?.label} weight="medium" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
};

export default HeaderNavigationMobile;
