'use client';

import { motion, AnimatePresence } from 'motion/react';
import { useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

import Icon from '@/components/Icon';
import classNames from '@/helpers/classNames';

import Button from '../Button';
import Text from '../Text';

import styles from './styles.module.scss';

interface ModalProps {
  show: boolean;
  onClose: (show: boolean) => void;
  children: ReactNode;
  className?: string;
  modalClassName?: string;
  title?: string;
  showHeader?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'full';
  align?: 'left' | 'center' | 'right';
  from?: 'left' | 'top' | 'right' | 'bottom';
  mountModal?: boolean;
  removeBackdrop?: boolean;
  // eslint-disable-next-line typescript-eslint/no-explicit-any -- motion Variants requires any
  customAnimations?: Record<string, Record<string, any>>;
}

const Modal = (props: ModalProps) => {
  const {
    show = true,
    onClose,
    showHeader = false,
    title,
    children,
    className,
    modalClassName,
    from = 'top',
    size,
    align,
    mountModal = false,
    removeBackdrop = false,
    customAnimations
  } = props;

  const modalRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const animations = customAnimations || {
    opacityHidden: {
      opacity: 0,
      transition: {
        duration: 0.3,
        ease: 'easeInOut'
      }
    },
    opacityVisible: {
      opacity: 1,
      transition: {
        duration: 0.3,
        ease: 'easeInOut'
      }
    },
    slideInHidden: {
      opacity: 0,
      ...{
        bottom: {
          x: 0,
          y: '4%'
        },
        left: {
          x: '-4%',
          y: 0
        },
        right: {
          x: '4%',
          y: 0
        },
        top: {
          x: 0,
          y: '-4%'
        }
      }[from]
    },
    slideInVisible: {
      opacity: 1,
      transition: {
        duration: 0.3,
        ease: 'easeInOut'
      },
      x: 0,
      y: 0
    }
  };

  const onCloseHandler = useCallback(() => {
    if (onClose) {
      onClose(false);
    }
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseHandler();
      }

      // Focus trap
      if (event.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };

    if (show) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onCloseHandler, show]);

  // Focus management: capture trigger and focus first element on open, restore on close
  useEffect(() => {
    if (show) {
      triggerRef.current = document.activeElement as HTMLElement;
      // Delay to allow animation to render
      const timer = setTimeout(() => {
        if (modalRef.current) {
          const firstFocusable = modalRef.current.querySelector<HTMLElement>(
            'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
          );
          firstFocusable?.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
    triggerRef.current?.focus();
  }, [show]);

  useEffect(() => {
    if (show) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [show]);

  return createPortal(
    <AnimatePresence mode="wait">
      {(show || mountModal) && (
        <motion.div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          {...(showHeader ? { 'aria-labelledby': 'modal-title' } : { 'aria-label': 'Modal' })}
          className={classNames(
            styles.modal,
            { [styles.show]: show },
            { [styles.removeBackdrop]: removeBackdrop },
            { show: show },
            modalClassName
          )}
          variants={animations}
          initial="opacityHidden"
          animate="opacityVisible"
          exit="opacityHidden"
        >
          <div className={styles.wrapper}>
            <motion.div
              className={classNames(
                'container',
                styles.container,
                styles[`size_${size}`],
                styles[`align_${align}`],
                className
              )}
              variants={animations}
              initial="slideInHidden"
              animate="slideInVisible"
              exit="slideInHidden"
            >
              {showHeader && (
                <div className={styles.header}>
                  <Text id="modal-title" text={title} />
                  <Button onClick={onCloseHandler} ariaLabel="Close Modal">
                    <Icon title="close" size="md" />
                  </Button>
                </div>
              )}
              <div className={styles.content}>{children}</div>
            </motion.div>
          </div>
          <div
            className={classNames(styles.overlay, 'overlay')}
            onClick={onCloseHandler}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onCloseHandler();
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="Close modal"
          />
        </motion.div>
      )}
    </AnimatePresence>,
    document.querySelector('#modal') as Element
  );
};

export default Modal;
