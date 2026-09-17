import classNames from 'classnames';

import type { FieldProps } from '../FieldCommon/Field';
import Field from '../FieldCommon/Field';

import styles from './styles.module.scss';

interface FieldSelectProps extends FieldProps {
  placeholder?: string;
  groupBy?: string;
  disabled?: boolean;
  validation?: Record<string, unknown>;
  options: {
    label: string;
    value: string;
    metadata?: Record<string, string>;
  }[];
}

type OptionGrouped = {
  label?: string;
  value?: string;
  labelGroup?: string;
  children?: { label: string; value: string }[];
}[];

/**
 * The `options` prop should be an array of objects with `label` and `value` properties.
 * If `groupBy` is provided, `options` can also have a `metadata` object with a property matching the `groupBy` value.
 */

const FieldSelect = (props: FieldSelectProps) => {
  const { className, groupBy, placeholder, options, disabled = false } = props;

  const optionsGrouped = options
    .reduce((accumulator, option) => {
      const group = groupBy && option?.metadata?.[groupBy];
      if (groupBy && group) {
        const groupExistingIndex = accumulator.findIndex((item) => item?.labelGroup === group);
        if (groupExistingIndex !== -1) {
          accumulator[groupExistingIndex]?.children?.push(option);
        } else {
          accumulator.push({ children: [option], labelGroup: group });
        }
      } else {
        accumulator.push(option);
      }
      return accumulator;
    }, [] as OptionGrouped)
    .toSorted((a, b) => {
      if (a.labelGroup && b.labelGroup) {
        return a.labelGroup.localeCompare(b.labelGroup);
      }
      if (a.label && b.label) {
        return a.label.localeCompare(b.label);
      }
      return 0;
    });

  return (
    <Field {...props}>
      {({ field, hasError }) => (
        <select
          {...field}
          className={classNames(styles.select, field.className, {
            [styles.placeholder]: field.value === ''
          })}
          disabled={disabled}
        >
          {placeholder && (
            <option value="" disabled data-default>
              {placeholder}
            </option>
          )}

          {optionsGrouped.map((option) => {
            if (option?.labelGroup && option?.children) {
              return (
                <optgroup label={option.labelGroup} key={`${option.labelGroup}-${Math.random() * 1000}`}>
                  {option.children.map((child) => (
                    <option value={child.value} key={`${child.value}-${Math.random() * 1000}`}>
                      {child.label}
                    </option>
                  ))}
                </optgroup>
              );
            }
            return (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            );
          })}
        </select>
      )}
    </Field>
  );
};

export default FieldSelect;
