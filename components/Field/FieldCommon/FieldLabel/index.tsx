import type { ReactNode } from 'react';

import Text from '@/components/Text';
import classNames from '@/helpers/classNames';

import styles from './styles.module.scss';

interface FieldLabelProps {
  text?: ReactNode;
  name?: string;
  className?: string;
  required?: boolean;
  children?: ReactNode;
}

/**
 * The design's field label — JetBrains Mono Bold, uppercase, tracked, in the accent ink — which is
 * how the RSVP comp sets every question ("01 · NAME", "03 · DIETARY REQUIREMENTS").
 *
 * The same treatment `FieldCheckbox` draws on its `<legend>`, so a group and a single control read
 * as the same kind of question. `size="xs"` is `--body-xs`, `fluid(11px, 12px)` — the comp's mobile
 * and desktop sizes exactly.
 */
const FieldLabel = (props: FieldLabelProps) => {
  const { text, name, className, children, required } = props;

  if (!text && !children) {
    return null;
  }

  return (
    <label htmlFor={name} className={classNames(styles.label, className)}>
      <Text as="span" size="xs" textTransform="uppercase" variant="mono" weight="bold">
        {children}
        {text}
        {required && <span className={styles.required}>*</span>}
      </Text>
    </label>
  );
};

export default FieldLabel;
