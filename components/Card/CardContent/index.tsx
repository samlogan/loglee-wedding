import type { ReactNode } from 'react';

import Text from '../../Text';

import styles from './styles.module.scss';

interface CardContentProps {
  title: string;
  subtitle: string;
  children?: ReactNode;
}

const CardContent = (props: CardContentProps) => {
  const { title, subtitle, children } = props;
  return (
    <div className={styles.container}>
      <Text as="span" text={subtitle} className={styles.subtitle} />
      <Text as="h3" text={title} className={styles.title} />
      {children && <div className={styles.content}>{children}</div>}
    </div>
  );
};

export default CardContent;
