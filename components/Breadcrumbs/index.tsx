import { Children, cloneElement, isValidElement } from 'react';
import type { FC, ReactElement } from 'react';

import type { BreadcrumbsItemProps } from './BreadcrumbsItem';
import BreadcrumbsItem from './BreadcrumbsItem';

import styles from './styles.module.scss';

interface BreadcrumbsProps {
  children: ReactElement<BreadcrumbsItemProps> | ReactElement<BreadcrumbsItemProps>[];
  separator?: string;
}

const Breadcrumbs: FC<BreadcrumbsProps> & { Item: FC<BreadcrumbsItemProps> } = (props) => {
  const { children, separator = '/' } = props;

  const childrenArray = Children.toArray(children);
  if (!childrenArray?.[0]) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb">
      <ol className={styles.container}>
        {childrenArray.map((child, index) => {
          const isLast = index === childrenArray.length - 1;
          return (
            <li className={styles.item} key={index}>
              {isLast && isValidElement(child)
                ? cloneElement(child, { 'aria-current': 'page' } as Partial<BreadcrumbsItemProps>)
                : child}
              {!isLast && <span className={styles.separator}>{separator}</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

Breadcrumbs.Item = BreadcrumbsItem;

export default Breadcrumbs;
