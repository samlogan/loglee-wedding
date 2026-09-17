import type { ReactNode } from 'react';

import classNames from '@/helpers/classNames';

import styles from './styles.module.scss';

export interface FieldContainerProps {
  className?: string;
  children: ReactNode;
  align?: 'left' | 'right' | 'none';
}

const FieldContainer = (props: FieldContainerProps) => {
  const { className, children, align = 'none' } = props;
  return <div className={classNames(styles.container, styles[`align_${align}`], className)}>{children}</div>;
};

export default FieldContainer;
