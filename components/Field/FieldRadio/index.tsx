import type { FieldProps } from '../FieldCommon/Field';
import Field from '../FieldCommon/Field';
import FieldRadioItem from './FieldRadioItem';

import styles from './styles.module.scss';

interface FieldRadioProps extends FieldProps {
  options: {
    value: string;
    label: string;
  }[];
  variant: 'default' | 'pill';
}

const FieldRadio = (props: FieldRadioProps) => {
  const { options, variant } = props;

  return (
    <Field {...props}>
      {({ field }) =>
        options?.map((option) => (
          <FieldRadioItem
            key={option.value}
            value={option.value}
            label={option.label}
            field={field}
            variant={variant}
          />
        ))
      }
    </Field>
  );
};

export default FieldRadio;
