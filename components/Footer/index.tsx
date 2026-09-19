import Container from '@/components/Container';
import Link from '@/components/Link';
import Logo from '@/components/Logo';
import type { SocialsProps } from '@/components/Socials';
import Socials from '@/components/Socials';
import Text from '@/components/Text';
import classNames from '@/helpers/classNames';
import formatDateRange from '@/helpers/formatDateRange';
import hasText from '@/helpers/hasText';
import type { IWeddingSettingsDocument } from '@/tools/sanity/schema/documents/weddingSettings';
import type { IHeaderObject } from '@/tools/sanity/schema/objects/header';

import styles from './styles.module.scss';

export interface FooterProps {
  className?: string;
  /**
   * `headerDocument.header` — **the same object the bar reads**, not a second list of the same five
   * links.
   *
   * There is no Figma frame for the footer, so the one thing the ticket does pin down is that its
   * links cannot disagree with the header's. Two ways to get there: a `sitemap` array on
   * `footerDocument` that an editor keeps in step by hand, or one array rendered twice. The second
   * is the only one that holds — a duplicate list does not drift *if* someone remembers, and
   * nothing in the Studio says a page was added to the bar and not to the foot.
   *
   * So this takes `IHeaderObject` whole rather than `navItems` alone: the prop names its source, and
   * `components/Layout` passes the identical expression to both components on adjacent lines.
   * `footerDocument` and its `footer` object type are gone with the fields that fed them.
   *
   * The action (`addButton` / `button`) is deliberately not rendered here. The bar carries the RSVP
   * pill on every page and it is sticky, so a second one at the foot is a duplicate control, not a
   * second chance.
   */
  header?: IHeaderObject;
  /** `weddingSettings.startDate` — the first day of the weekend. */
  startDate?: string | null;
  /** `weddingSettings.endDate` — the last. Blank for a one-day wedding. */
  endDate?: string | null;
  /** `weddingSettings.venue` — only `name` is rendered; `address` and `mapUrl` belong to the sections that use them. */
  venue?: IWeddingSettingsDocument['venue'] | null;
  /** `socialMediaDocument.socials`. Renders nothing at all when the document is empty. */
  socials?: SocialsProps['socials'];
}

/**
 * The closing mark: wordmark, the header's five links, and the date and venue read off the wedding
 * singleton.
 *
 * **No design exists for this.** Every one of the seven page frames ends after its last content
 * section, so nothing here is measured against a drawing — it is composed out of the header's own
 * vocabulary so the two read as a pair. Specifically: the same `--stroke-cards` hairline (a
 * `border-top` where the bar has a `border-bottom`), the same `Container width="xl"` and site
 * gutter, the same link type, and the same fluid tokens throughout. Treat it as a first pass to be
 * revised if a footer frame ever appears.
 *
 * Pinned to the light theme for the same reason the bar is: the frames draw one off-white chrome
 * with near-black ink regardless of what the page between them does, and bookending the page in the
 * same ink is what makes the two rules read as one frame rather than two unrelated lines.
 *
 * A server component, unlike `Header`. It has no state, no disclosure and no current-page marking,
 * so it needs neither a hook nor an event handler. That last one is a decision rather than an
 * oversight: `aria-current="page"` here would mean `usePathname`, which would mean `'use client'`
 * on this file — pulling `Container`, `Text`, `Logo`, `Socials` and the footer itself into the
 * client bundle, where today only the `Link` leaf goes — and the bar at the top of the same page
 * already announces where the reader is. Marking it twice is not twice as useful.
 */
const Footer = (props: FooterProps) => {
  const { className, header, startDate, endDate, venue, socials } = props;
  const { navItems } = header || {};

  const dates = formatDateRange(startDate, endDate);
  /*
   * Left blank, the venue would render as a separator with nothing after it. Blank includes a name
   * that is only whitespace, and in the Presentation tool that name arrives stega-encoded, which a
   * plain `.trim()` test reads as populated — `hasText` explains why and sees through it. What
   * renders is still the encoded `venueName`, so the overlay keeps working on the text on screen.
   */
  const venueName = venue?.name?.trim();
  const hasVenue = hasText(venueName);
  const hasDetails = Boolean(dates || hasVenue);

  return (
    /*
     * `id` and `tabIndex` sit on the landmark itself, which is what `AccessibilityMenu`'s third
     * skip link ("Footer navigation") targets.
     *
     * This used to be a separate `<a id="footer" tabIndex={-1} />` immediately above, on the
     * reasoning that focus should land *above* the landmark rather than inside it. Measured, that
     * anchor resolves to `{ role: 'generic', name: '' }` — so a reader who took the skip link heard
     * nothing at all and had no way to know the jump had worked. Focusing the landmark announces
     * "content information" and then begins reading it, which is the confirmation the anchor could
     * not give, and a landmark's own focus is already above its content. It also retires an element
     * that belonged to no landmark at all.
     *
     * `#content` in `components/Header` is still the old shape; see the review notes.
     */
    <footer className={classNames(styles.footer, className)} data-theme="light" id="footer" tabIndex={-1}>
      <Container className={styles.inner} width="xl">
        <div className={styles.primary}>
          <Logo className={styles.wordmark} />

          {Boolean(navItems?.length) && (
            <nav aria-label="Footer" className={styles.nav}>
              {/*
               * `role="list"` is not redundant here. The global reset sets `list-style-type: none`
               * on every `ul`, and WebKit deliberately strips the `list` role from an unstyled list
               * that does not claim it back — so in Safari/VoiceOver, the browser pairing most
               * likely for this site's audience, the five links would arrive with no "list, 5
               * items" and no "2 of 5" position. Chromium keeps the role either way, which is why
               * this does not show up in the axe pass.
               */}
              <ul className={styles.list} role="list">
                {navItems?.map((navItem, index) => (
                  <li className={styles.item} key={navItem?._key ?? index}>
                    {/*
                     * An item whose destination an editor left blank falls through to `Link`'s
                     * inert `<span>`, which announces as text rather than as a broken control.
                     */}
                    <Link {...navItem?.link} className={styles.link}>
                      {navItem?.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>

        {/*
         * The date and venue, as one line and never as a half of one. Each half is dropped on its
         * own when blank and the whole line disappears when both are — an editor who has not
         * filled in the venue yet gets "29–31 May 2026", not "29–31 May 2026 ·".
         *
         * The separator is `aria-hidden` rather than part of either string: it is punctuation
         * standing in for a line break, and how a screen reader pronounces a middle dot varies by
         * reader and verbosity setting.
         *
         * The `{' '}` either side is not the visible gap — that is the flex `column-gap`, so the
         * two halves stay separated however the line wraps. A whitespace-only anonymous flex item
         * is not rendered at all (CSS Flexbox §4), so these cost nothing on screen. What they buy
         * is the *text*: without them the separator is the only thing between "2027" and
         * "Kangaroo", and it is both `aria-hidden` and `user-select: none` — so copying the line
         * yielded "…2027Kangaroo Valley", which is exactly what the note on `.separator` claims
         * does not happen.
         */}
        {hasDetails && (
          <Text as="p" className={styles.details} size="sm">
            {Boolean(dates) && <span>{dates}</span>}
            {Boolean(dates && hasVenue) && (
              <>
                {' '}
                <span aria-hidden="true" className={styles.separator}>
                  &middot;
                </span>{' '}
              </>
            )}
            {hasVenue && <span>{venueName}</span>}
          </Text>
        )}

        {/* Renders `null` when the document is empty, which is every dataset that has not had one
            filled in — so this costs the layout nothing until it has something to show. */}
        <Socials className={styles.socials} size="sm" socials={socials} />
      </Container>
    </footer>
  );
};

export default Footer;
