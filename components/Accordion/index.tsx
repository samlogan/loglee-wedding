'use client';

import { useState, useEffect, Children, cloneElement } from 'react';
import type { ReactElement, KeyboardEvent } from 'react';

import classNames from '@/helpers/classNames';

import Button from '../Button';
import AccordionItem from './AccordionItem';

import styles from './styles.module.scss';

interface AccordionProps {
  // eslint-disable-next-line typescript-eslint/no-explicit-any -- AccordionItem props need to be spread
  children?: ReactElement<any>[] | ReactElement<any>;
  activeIndex?: number;
  showAll?: boolean;
  showLimit?: number;
  className?: string;
}

const Accordion = (props: AccordionProps) => {
  const { className, children, activeIndex = -1, showAll = true, showLimit = 5 } = props;

  const [active, setActive] = useState(activeIndex);
  const [limit, setLimit] = useState(showLimit);

  useEffect(() => {
    setActive(activeIndex);
  }, [activeIndex]);

  if (!children) {
    return null;
  }

  const onClickHandler = (event: KeyboardEvent, index: number) => {
    // Ignore Tab key (keyboard interaction)
    if (event.key === 'Tab') {
      return null;
    }
    setActive((state) => (state === index ? -1 : index));
  };

  return (
    <div className={classNames(styles.accordion, className)}>
      {Children.map(children, (child, index) => {
        if (!showAll && index >= limit) {
          return null;
        }
        return cloneElement(child, {
          ...child?.props,
          active: active === index,
          setActive: (event: KeyboardEvent<Element>) => onClickHandler(event, index)
        });
      })}

      {!showAll && Array.isArray(children) && children?.length > limit && (
        <div className={styles.action}>
          <Button
            text="Show more"
            size="sm"
            theme="primary"
            variant="pill"
            ariaLabel="Show more"
            onClick={() => setLimit((state) => state + showLimit)}
          />
        </div>
      )}
    </div>
  );
};

Accordion.Item = AccordionItem;

export default Accordion;
