'use client';

import NextLink from 'next/link';
import type { AnchorHTMLAttributes, ReactNode } from 'react';

import type { ButtonAppearanceProps } from '@/components/Button/appearance';
import { ButtonArrow, buttonClasses, inertClasses } from '@/components/Button/appearance';
import stringClean from '@/tools/helpers/stringClean';
import type { ILinkElement } from '@/tools/sanity/schema/elements/link';

/*
 * `ButtonAppearanceProps` rather than a parallel copy of the same six props.
 *
 * A link styled as a button and a button are the same control on different elements — the design
 * names every one of them "Link" — and the two declarations had already drifted once: `Link` knew
 * about `variant="content"` and `Button` did not. One source, one class-composition helper.
 */
export interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement>, ButtonAppearanceProps {
  children?: ReactNode;
  className?: string;
  id?: string;
  href?: string;
  /*
   * `string`, where `ButtonProps.text` is `string | number`. The two deliberately differ: this
   * one doubles as the accessible-name fallback (`ariaLabel = text || title || ''`) and
   * `aria-label` takes a string, so widening it only buys a `String()` coercion on the name path.
   */
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
}

/**
 * Spoken after the name of a link that opens a new tab, so a screen-reader user is not dropped into
 * a fresh tab with no history to go back through (WCAG G201). Visually hidden rather than shown:
 * the arrow and the context already say "this goes elsewhere" to a sighted reader.
 */
const NEW_TAB_NOTE = ' (opens in a new tab)';

// No shared sr-only utility exists in this repo, deliberately; this is the one place Link needs it.
const VISUALLY_HIDDEN = {
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  whiteSpace: 'nowrap',
  width: 1
} as const;

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
    target,
    newWindow = false,
    tabIndex = 0,
    arrow,
    /*
     * Everything from here to `action` is pulled out to keep it *off* the element, not
     * because this function reads it — `buttonClasses` is handed `props` whole below.
     *
     * `rest` is spread onto an `<a>`, so any prop left in it becomes a DOM attribute. `action` is
     * the one that bites in production: `linkProjection` returns it and consumers spread the whole
     * link object (`<Link {...button?.link}>`), so an editor picking "Action" in the Studio used to
     * emit `<a action="…">`. React passes unknown attributes through to the DOM without warning, so
     * nothing flagged it. The appearance props below are the same problem in waiting.
     */
    variant,
    size,
    theme,
    outline,
    mono,
    fullWidth,
    fullWidthMobile,
    action,
    ...rest
  } = props;

  if (rest?._type) {
    // Prevents the _type prop from being passed to the <a> element
    delete rest._type;
  }

  const linkType = stringClean(rawLinkType);

  /*
   * `props` whole, rather than a hand-assembled copy of the appearance axes.
   *
   * The copy had already gone stale — it passed `arrow`, which `buttonClasses` does not read — and
   * it is one of the two lists a ninth appearance prop would have had to be added to. Passing the
   * props object means `ButtonAppearanceProps` is the only place that list lives.
   */
  const classes = buttonClasses(props, className);
  /*
   * The same list plus the inert modifier, for the two `<span>` branches below. Built here
   * rather than at each `return` so the two cannot drift.
   */
  const inert = inertClasses(props, className);

  const linkTarget = newWindow ? '_blank' : target;

  /*
   * Composed once, not per branch.
   *
   * Every return below renders the same content, and the arrows have to sit inside whichever
   * element wins — including the plain `<span>` fallback, which is what an unresolvable link type
   * renders. Building it in each branch is how the six branches drift apart.
   */
  const label = children || text || title;
  const child = (
    <>
      {arrow === 'left' && <ButtonArrow direction="left" />}
      {label}
      {arrow === 'right' && <ButtonArrow direction="right" />}
    </>
  );

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

    /*
     * There used to be a `forceLinkWhenEmpty` escape hatch above this, which rendered a
     * destination-less link as `<a href="#" role="button">`. Its only caller was the header's
     * dropdown parent, and it failed two criteria at once: an anchor is not activated by Space
     * (WCAG 2.1.1), and a click on it navigates to the fragment rather than doing whatever the
     * button role promised (WCAG 4.1.2). The header no longer has dropdowns, and anything that
     * genuinely needs a control with no destination should render a `<Button>`.
     */
    if (!linkHref) {
      return (
        <span className={inert} id={id} {...rest}>
          {child}
        </span>
      );
    }

    if (linkHref === '/home/') {
      linkHref = '/';
    }

    return (
      <NextLink href={linkHref} prefetch={true} {...commonProps}>
        {child}
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
          {child}
        </NextLink>
      );
    }
    /*
     * Off-site links open in a new tab, so the wedding site stays open behind them — unless a caller
     * asked for something else with `target` or `newWindow`. `noreferrer` also implies `noopener`, so
     * the opened page cannot reach back and navigate this one.
     *
     * The note joins the accessible name whichever way it is formed: appended to an explicit
     * `aria-label`, which would otherwise override the content, or as hidden text inside it.
     */
    const opensNewTab = (linkTarget ?? '_blank') === '_blank';
    const label = commonProps['aria-label'];
    return (
      <a
        href={linkHref}
        rel="nofollow noreferrer"
        {...commonProps}
        aria-label={label && opensNewTab ? `${label}${NEW_TAB_NOTE}` : label}
        target={linkTarget ?? '_blank'}
      >
        {child}
        {opensNewTab && !label && <span style={VISUALLY_HIDDEN}>{NEW_TAB_NOTE}</span>}
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
          {child}
        </a>
      );
    }
  }

  if (linkType === 'email' || email) {
    const emailHref = email || href;
    if (emailHref) {
      return (
        <a href={`mailto:${emailHref}`} {...commonProps}>
          {child}
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
    <span className={inert} id={id} {...rest}>
      {child}
    </span>
  );
};

export default Link;
