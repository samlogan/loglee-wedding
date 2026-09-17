'use client';

import NextLink from 'next/link';
import type { AnchorHTMLAttributes, ReactNode } from 'react';

import classNames from '@/helpers/classNames';
import stringClean from '@/tools/helpers/stringClean';
import type { ILinkElement } from '@/tools/sanity/schema/elements/link';

import Text from '../Text';

import styles from '../Button/styles.module.scss';

export interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  children?: ReactNode;
  className?: string;
  id?: string;
  href?: string;
  text?: string;
  title?: string;
  ariaLabel?: string;
  _type?: string;
  linkType?: ILinkElement['linkType'];
  externalLink?: ILinkElement['externalLink'];
  internalLink?: ILinkElement['internalLink'];
  phone?: string;
  email?: string;
  action?: string;
  target?: '_blank' | '_self' | '_parent' | '_top' | string;
  newWindow?: boolean;
  tabIndex?: number;
  theme?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  variant?: 'rounded' | 'square' | 'pill' | 'content';
  outline?: boolean;
  forceLinkWhenEmpty?: boolean;
}

const Link = (props: LinkProps) => {
  const {
    children,
    className,
    id,
    href,
    text,
    title,
    ariaLabel = text || title || '',
    linkType: rawLinkType,
    internalLink,
    phone,
    email,
    externalLink,
    target = '_self',
    newWindow = false,
    tabIndex = 0,
    variant,
    size,
    theme,
    outline = false,
    forceLinkWhenEmpty,
    ...rest
  } = props;

  if (rest?._type) {
    // Prevents the _type prop from being passed to the <a> element
    delete rest._type;
  }

  const linkType = stringClean(rawLinkType);

  const classes = classNames(
    styles.button,
    className,
    { [styles[`size_${size}`]]: !!size },
    { [styles[`variant_${variant}`]]: !!variant },
    { [styles[`theme_${theme}`]]: !!theme },
    { [styles.outline]: outline }
  );

  const linkTarget = newWindow ? '_blank' : target;
  const child = children || text || title;

  const commonProps = {
    /*
     * Omitted when empty, never emitted as `aria-label=""`.
     *
     * `ariaLabel` defaults to `text || title || ''`, so an icon-only link — a social share button, a
     * card overlay — produced an empty attribute. That is worse than having none: an empty
     * `aria-label` overrides the accessible name entirely, so the link announces nothing at all
     * rather than falling back to its content. axe reports it as "Links must have discernible text",
     * and the story suite catches it now.
     */
    'aria-label': ariaLabel || undefined,
    className: classes,
    id,
    tabIndex,
    target: linkTarget,
    title,
    ...rest
  };

  if (linkType === 'internal' || !linkType) {
    let linkHref = internalLink?.pathname || href;

    if (!linkHref && forceLinkWhenEmpty) {
      return (
        <a href="#" role="button" {...commonProps}>
          {child}
        </a>
      );
    }

    if (!linkHref) {
      return (
        <span className={classes} id={id} {...rest}>
          {child}
        </span>
      );
    }

    if (linkHref === '/home/') {
      linkHref = '/';
    }

    return (
      <NextLink href={linkHref} prefetch={true} {...commonProps}>
        {children || text || title}
      </NextLink>
    );
  }

  if (linkType === 'external') {
    const linkHref = externalLink || href;
    const isRelative =
      linkHref?.startsWith('/') ||
      (process.env.NEXT_PUBLIC_SITE_URL && linkHref?.includes(process.env.NEXT_PUBLIC_SITE_URL));
    if (isRelative && linkHref) {
      return (
        <NextLink href={linkHref} prefetch={true} {...commonProps}>
          {children || text || title}
        </NextLink>
      );
    }
    return (
      <a href={linkHref} rel="nofollow noreferrer" {...commonProps}>
        {children || text || title}
      </a>
    );
  }

  /*
   * Both branches require an actual destination before rendering an anchor.
   *
   * An editor can select "Phone" or "Email" in the Studio and leave the field empty — a rich-text
   * link annotation in this dataset does exactly that. Keying only on `linkType` then rendered
   * `href="tel:"` (or `mailto:undefined`), which is a dead link that still reads as a link to a
   * screen reader and still invites a tap on mobile. With no destination this falls through to the
   * plain `<span>` below, so the label still shows but nothing pretends to be actionable.
   */
  if (linkType === 'phone' || phone) {
    const phoneHrefClean = (phone || href || '').replaceAll(/[^0-9]/g, '');
    if (phoneHrefClean) {
      return (
        <a href={`tel:${phoneHrefClean}`} {...commonProps}>
          {children || text || title}
        </a>
      );
    }
  }

  if (linkType === 'email' || email) {
    const emailHref = email || href;
    if (emailHref) {
      return (
        <a href={`mailto:${emailHref}`} {...commonProps}>
          {children || text || title}
        </a>
      );
    }
  }

  /*
   * Everything that is not a resolvable destination lands here, including `linkType: 'action'`.
   *
   * The Studio offers "Action" as a link type and stores a string, and nothing on the front end
   * consumes it — there is no action registry in this boilerplate, so an editor choosing it today
   * gets a label that does nothing. Left unimplemented rather than guessed at: the contract (which
   * actions exist, how one is dispatched) is a project decision, and a plain `<span>` is the honest
   * rendering in the meantime — visible, not pretending to be actionable. Implement it per project
   * and add a story with a `play` function asserting the interaction, which is what a story for a
   * behavioural prop has to do to be worth anything.
   */
  return (
    <span className={classes} id={id} {...rest}>
      {child}
    </span>
  );
};

export default Link;
