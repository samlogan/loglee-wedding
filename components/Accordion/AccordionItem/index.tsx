'use client';

import { useId } from 'react';
import type { ReactNode } from 'react';

import classNames from '@/helpers/classNames';
import useElementHeight from '@/tools/hooks/useElementHeight';

import Icon from '../../Icon';
import Text from '../../Text';

import styles from './styles.module.scss';

interface AccordionItemProps {
  title: ReactNode | string;
  content?: string;
  children?: ReactNode;
  active?: boolean;
  setActive?: () => void;
  className?: string;
  classNameTrigger?: string;
}

const AccordionItem = (props: AccordionItemProps) => {
  const { title, content, children, active, setActive, className, classNameTrigger } = props;

  const classes = classNames(styles.item, { [styles.active]: active }, className);
  const id = useId();
  const contentId = `accordion-content-${id}`;

  const [ref, height] = useElementHeight({ disabled: !active });

  return (
    <div className={classes}>
      <button
        className={classNames(styles.title, classNameTrigger)}
        data-name="FAQTitle"
        onClick={setActive}
        aria-label={active ? 'Close accordion item' : 'Open accordion item'}
        aria-expanded={active}
        aria-controls={contentId}
      >
        {typeof title === 'string' ? <Text text={title} size="lg" weight="regular" color="themeFgDefault" /> : title}
        {(!!children || !!content) && <Icon className={styles.icon} title="plus" size="lg" color="themeFgDefault" />}
      </button>
      <div
        id={contentId}
        className={styles.content}
        style={{ maxHeight: active && height ? height : 0 }}
        aria-hidden={!active}
      >
        <div className={styles.wrapper} ref={ref}>
          {children || content}
        </div>
      </div>
    </div>
  );
};

export default AccordionItem;
