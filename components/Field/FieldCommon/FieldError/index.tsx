import Text from '@/components/Text';
import classNames from '@/helpers/classNames';

import styles from './styles.module.scss';

interface FieldErrorProps {
  name?: string;
  error?: {
    type: string;
    message: string;
  };
  className?: string;
}

const FieldError = (props: FieldErrorProps) => {
  const { name, error, className } = props;
  const errorType = error?.type;
  const errorMessage = error?.message;
  const message = errorType === 'required' ? 'This field is required' : errorMessage;
  const classes = classNames(styles.container, { [styles.hasError]: !!error }, className);

  return (
    <div className={classes} id={name ? `${name}-error` : undefined} role="alert" aria-live="polite">
      <Text as="span" className={styles.message} text={message} />
    </div>
  );
};

export default FieldError;
