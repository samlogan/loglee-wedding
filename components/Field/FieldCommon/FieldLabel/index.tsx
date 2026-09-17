import classNames from 'classnames';
import type { FC, ReactNode } from 'react';

import Text from '@/components/Text';

import styles from './styles.module.scss';

interface FieldLabelProps {
  text?: string;
  name?: string;
  className?: string;
  required?: boolean;
  children?: ReactNode;
}

const FieldLabel: FC<FieldLabelProps> = (props) => {
  const { text, name, className, children, required } = props;
  const classes = classNames(styles.label, className);

  if (!text && !children) {
    return null;
  }

  return (
    <label htmlFor={name} className={classes}>
      {children && <span>{children}</span>}
      {text && <Text as="span" text={text} />}
      {required && <span className={styles.required}>*</span>}
    </label>
  );
};

export default FieldLabel;
