import Container from '@/components/Container';
import Link from '@/components/Link';
import Logo from '@/components/Logo';
import type { SocialsProps } from '@/components/Socials';
import Socials from '@/components/Socials';
import Text from '@/components/Text';
import classNames from '@/helpers/classNames';
import formatDateRange from '@/helpers/formatDateRange';
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
 * for the whole subtree — and the bar at the top of the same page already announces where the
 * reader is. Marking it twice is not twice as useful.
 */
const Footer = (props: FooterProps) => {
  const { className, header, startDate, endDate, venue, socials } = props;
  const { navItems } = header || {};

  const dates = formatDateRange(startDate, endDate);
  /*
   * Trimmed, because a venue name that is only whitespace is blank as far as a reader is concerned
   * and `Boolean(' ')` is `true`. Left blank it would render as a separator with nothing after it.
   */
  const venueName = venue?.name?.trim();
  const hasDetails = Boolean(dates || venueName);

  return (
    <>
      {/* The target of `AccessibilityMenu`'s third skip link. Outside `<footer>`, so focus lands
          above the landmark rather than inside it. */}
      <a id="footer" tabIndex={-1} />
      <footer className={classNames(styles.footer, className)} data-theme="light">
        <Container className={styles.inner} width="xl">
          <div className={styles.primary}>
            <Logo className={styles.wordmark} />

            {Boolean(navItems?.length) && (
              <nav aria-label="Footer">
                <ul className={styles.list}>
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
           * reader and verbosity setting. The space either side of it is the flex `column-gap`
           * rather than a character, so the two halves stay separated however the line wraps.
           */}
          {hasDetails && (
            <Text as="p" className={styles.details} size="sm">
              {Boolean(dates) && <span>{dates}</span>}
              {Boolean(dates && venueName) && (
                <span aria-hidden="true" className={styles.separator}>
                  &middot;
                </span>
              )}
              {Boolean(venueName) && <span>{venueName}</span>}
            </Text>
          )}

          {/* Renders `null` when the document is empty, which is every dataset that has not had one
              filled in — so this costs the layout nothing until it has something to show. */}
          <Socials className={styles.socials} size="sm" socials={socials} />
        </Container>
      </footer>
    </>
  );
};

export default Footer;
