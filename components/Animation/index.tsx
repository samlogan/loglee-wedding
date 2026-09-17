'use client';

import { useInView } from 'motion/react';
import { useRef } from 'react';

import classNames from '@/helpers/classNames';

import styles from './styles.module.scss';

interface AnimationProps {
  className?: string;
  children: React.ReactNode;
  animation?: 'fade' | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight';
  amount?: 'some' | 'all' | number;
  once?: boolean;
  delay?: number;
}

const Animation = (props: AnimationProps) => {
  const { className, children, animation = 'slideUp', delay = 0, amount = 0.5, once = true } = props;

  const ref = useRef(null);
  const show = useInView(ref, { amount, once });
  const classes = classNames(styles.animation, className, { [styles.show]: show }, styles[animation]);

  return (
    <div className={classes} ref={ref} style={{ transitionDelay: `${delay}s` }}>
      {children}
    </div>
  );
};

export default Animation;
