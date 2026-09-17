import { Children, cloneElement } from 'react';
import type { ReactNode } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import classNames from '@/helpers/classNames';

import styles from './styles.module.scss';

interface FormStepProps {
  children: ReactNode;
  className?: string;
  title?: string;
  hideNext?: boolean;
  isPrevious?: boolean;
  isCurrentStep?: boolean;
  isNext?: boolean;
  methods?: UseFormReturn;
}

const FormStep = (props: FormStepProps) => {
  const { children, isPrevious, isCurrentStep, isNext, methods, className } = props;

  const classes = classNames(styles.container, {
    [styles.previous]: isPrevious,
    [styles.next]: isNext,
    [styles.current]: isCurrentStep
  });

  return (
    <div className={classes}>
      <div className={classNames(styles.wrapper, className)}>
        {Children.map(children, (child) =>
          cloneElement(child as React.ReactElement<Record<string, any>>, { register: methods?.register })
        )}
      </div>
    </div>
  );
};

export default FormStep;
