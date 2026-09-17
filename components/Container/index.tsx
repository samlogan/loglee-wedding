import type { ReactNode, Ref } from 'react';

import classNames from '@/helpers/classNames';

import styles from './styles.module.scss';

export type ContainerWidth = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ContainerProps {
  children: ReactNode;
  style?: object;
  /**
   * React 19 ref-as-prop, replacing `forwardRef`.
   *
   * This interface already declared `ref`, but the component was a `forwardRef`, which strips `ref`
   * out of props before they arrive — so the declared prop was a phantom that could never be
   * received here. Now it is a real prop and the two agree.
   */
  ref?: Ref<HTMLDivElement>;
  className?: string;
  width?: ContainerWidth;
}

const Container = (props: ContainerProps) => {
  const { className, children, style, width, ref } = props;
  const classes = classNames(styles.container, width && styles[`width_${width}`], className);
  return (
    <div className={classes} style={style || {}} ref={ref}>
      {children}
    </div>
  );
};

export default Container;
