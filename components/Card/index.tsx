import NextLink from 'next/link';
import type { ReactNode } from 'react';

import classNames from '@/helpers/classNames';

import CardContent from './CardContent';
import CardImage from './CardImage';

import styles from './styles.module.scss';

interface CardBaseProps {
  className?: string;
  children: ReactNode;
  variant?: 'default' | 'outline';
}

/**
 * `href` and `ariaLabel` travel together, enforced by the compiler rather than by this comment.
 *
 * A linked card renders an empty overlay link stretched across itself, so it has no text of its own
 * — a screen reader announces only the destination, and a page of cards reads as a list of identical
 * unlabelled links. axe reports it as "Links must have discernible text". Name it after the card's
 * heading, which is what a sighted user is clicking.
 *
 * This was a prose requirement on an optional prop until review pointed out that the two disagreed:
 * the comment said "required whenever `href` is set" and the type said `ariaLabel?`. A caller
 * omitting it got an unnamed link and no warning. The union closes that at compile time. It is
 * deliberately not a runtime throw — crashing a page render over a missing accessible name is worse
 * than the fault it reports, and a blank label still fails the a11y check on the story.
 */
export type CardProps = CardBaseProps & ({ href: string; ariaLabel: string } | { href?: never; ariaLabel?: never });

const Card = (props: CardProps) => {
  const { className, children, variant = 'outline' } = props;
  const { href, ariaLabel } = props;
  const classes = classNames(styles.card, styles[`variant_${variant}`], className);

  if (href) {
    return (
      <div className={classes}>
        <NextLink href={href} className={styles.linkOverlay} aria-label={ariaLabel} />
        <div className={styles.wrapper}>{children}</div>
      </div>
    );
  }

  return (
    <div className={classes}>
      <div className={styles.wrapper}>{children}</div>
    </div>
  );
};

Card.Image = CardImage;
Card.Content = CardContent;

export default Card;
