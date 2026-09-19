import classNames from '@/helpers/classNames';

import type { FieldControlledProps } from '../FieldCommon/FieldControlled';
import FieldControlled from '../FieldCommon/FieldControlled';

import styles from './styles.module.scss';

export interface FieldNumberProps extends FieldControlledProps {
  step?: number;
  min?: number;
  max?: number;
  hideButtons?: boolean;
  placeholder?: string;
  disabled?: boolean;
  /**
   * The two buttons' accessible names. Their visible "−" and "+" are decoration, and a bare
   * "Decrease" does not say *what* — pass a name that does ("Remove a child").
   */
  decrementLabel?: string;
  incrementLabel?: string;
}

/** A value the stepper can do arithmetic on. A cleared input reads as the floor, not as `NaN`. */
const toNumber = (value: unknown, fallback: number): number => {
  const number = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
  return Number.isFinite(number) ? number : fallback;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * A number with a − / + stepper either side of it, drawn as one bordered control (Figma node 1:849).
 *
 * The input stays a real `type="number"`, so ArrowUp / ArrowDown step it natively and it can be typed
 * into; the buttons are the pointer affordance and are reachable by Tab as well.
 *
 * At a limit the button goes `aria-disabled` and ignores presses rather than taking the `disabled`
 * attribute. A disabled button drops focus to `<body>` the moment it disables, which is exactly the
 * press that reached the limit — so a keyboard user stepping down to zero lost their place in the
 * form. This way focus stays put and the limit is still announced.
 *
 * A typed value outside the range, or not a whole step, is pulled back into range when the input
 * loses focus. That is a courtesy, not a guarantee: whatever receives the value validates it.
 */
const FieldNumber = (props: FieldNumberProps) => {
  const {
    decrementLabel = 'Decrease',
    hideButtons = false,
    incrementLabel = 'Increase',
    max = 100,
    min = 0,
    placeholder,
    step = 1
  } = props;

  return (
    <FieldControlled {...props}>
      {({ field, hasError }) => {
        const current = toNumber(field.value, min);
        const atMin = current <= min;
        const atMax = current >= max;
        const stepBy = (direction: 1 | -1) => field.onChange(clamp(current + direction * step, min, max));
        const onBlur = () => {
          field.onBlur();
          const settled = clamp(Math.round(current / step) * step, min, max);
          if (settled !== field.value) {
            field.onChange(settled);
          }
        };

        return (
          <div className={classNames(styles.stepper, { [styles.error]: hasError })}>
            {!hideButtons && (
              <button
                aria-controls={field.id}
                aria-disabled={atMin || undefined}
                aria-label={decrementLabel}
                className={styles.button}
                onClick={() => !atMin && stepBy(-1)}
                type="button"
              >
                <span aria-hidden="true">−</span>
              </button>
            )}
            <input
              {...field}
              className={styles.input}
              inputMode="numeric"
              max={max}
              min={min}
              onBlur={onBlur}
              placeholder={placeholder}
              step={step}
              type="number"
            />
            {!hideButtons && (
              <button
                aria-controls={field.id}
                aria-disabled={atMax || undefined}
                aria-label={incrementLabel}
                className={styles.button}
                onClick={() => !atMax && stepBy(1)}
                type="button"
              >
                <span aria-hidden="true">+</span>
              </button>
            )}
            {/*
             * The value, spoken when it changes. A press on "+" moves nothing a screen reader is
             * looking at — focus is on the button and the button's name has not changed — so without
             * this the count went up in silence. Polite, and only ever the number: the reader has just
             * pressed a button named for what it does.
             */}
            <span aria-live="polite" className={styles.visuallyHidden}>
              {String(field.value ?? '')}
            </span>
          </div>
        );
      }}
    </FieldControlled>
  );
};

export default FieldNumber;
