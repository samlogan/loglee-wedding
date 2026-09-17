import Icon from '@/components/Icon';

import type { FieldControlledProps } from '../FieldCommon/FieldControlled';
import FieldControlled from '../FieldCommon/FieldControlled';

import styles from './styles.module.scss';

interface FieldNumberProps extends FieldControlledProps {
  step?: number;
  min?: number;
  max?: number;
  hideButtons?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

const FieldNumber = (props: FieldNumberProps) => {
  const { step = 1, min = 0, max = 100, hideButtons = false, placeholder } = props;

  const onChangeHandler = ({
    value,
    addValue,
    onChange
  }: {
    value: number;
    addValue: number;
    onChange: (value: number) => void;
  }) => {
    const valueNumber = isNaN(value) ? 0 : Number(value);
    const valueAddition = valueNumber + addValue;
    const valueInRange = Math.min(Math.max(valueAddition, min), max);
    onChange(valueInRange);
  };

  return (
    <FieldControlled {...props} valueAs="number">
      {({ field }) => (
        <div>
          {!hideButtons && (
            <button
              type="button"
              className={styles.button}
              onClick={() => onChangeHandler({ addValue: -1, onChange: field.onChange, value: field.value })}
              disabled={field.value <= min}
            >
              <Icon title="minus" />
            </button>
          )}
          <input {...field} type="number" min={min} max={max} step={step} placeholder={placeholder} />
          {!hideButtons && (
            <button
              type="button"
              className={styles.button}
              onClick={() => onChangeHandler({ addValue: 1, onChange: field.onChange, value: field.value })}
              disabled={field.value >= max}
            >
              <Icon title="plus" />
            </button>
          )}
        </div>
      )}
    </FieldControlled>
  );
};

export default FieldNumber;
