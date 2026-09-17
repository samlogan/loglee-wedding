import Text from '@/components/Text';
import classNames from '@/helpers/classNames';

import styles from './styles.module.scss';

interface FieldRadioItemProps {
  field: Record<string, unknown> & { className?: string };
  label: string;
  value: string;
  variant?: 'default' | 'pill';
}

const FieldRadioItem = (props: FieldRadioItemProps) => {
  const { label, value, field } = props;
  return (
    <div className={styles.container}>
      <input type="radio" {...field} className={classNames(styles.input, field.className)} id={value} value={value} />
      <label htmlFor={value} className={styles.label}>
        <span className={styles.radio}>
          <span className={styles.radioMarker} />
        </span>
        <Text as="span" text={label} />
      </label>
    </div>
  );
};

export default FieldRadioItem;
