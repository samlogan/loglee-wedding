import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import { expect, within } from 'storybook/test';

import type { SocialsProps } from '@/components/Socials';
import formatDate from '@/helpers/formatDate';
import formatDateRange from '@/helpers/formatDateRange';
import type { IHeaderDocument } from '@/tools/sanity/schema/documents/headerDocument';
import type { IWeddingSettingsDocument } from '@/tools/sanity/schema/documents/weddingSettings';
import type { IHeaderObject } from '@/tools/sanity/schema/objects/header';
import globalFixture from '@/tools/storybook/globalFixture';
import mockButton from '@/tools/storybook/mockButton';
import mockLink from '@/tools/storybook/mockLink';

import Footer from '.';

const navItem = (title: string, pathname: string): IHeaderObject['navItems'][number] => ({
  _key: pathname,
  title,
  link: mockLink({ internalLink: { title, slug: { current: pathname }, pathname } })
});

/**
 * The same five links `Header.stories.tsx` falls back to, because they are the same five links —
 * both components read `headerDocument.header`, and this file reads the same fixture key the header
 * story does.
 *
 * Only a fallback. `globalFixture` returns `undefined` when the key is missing or null, which is
 * what this project's dataset currently yields since nothing has been published to it. The guard
 * below tests the *field* this component renders rather than the object, because a GROQ projection
 * hands back a shaped object with null leaves for a document whose fields are blank, and that object
 * is not nullish — a bare `?? FALLBACK` would not fire for it.
 */
const FALLBACK_HEADER: IHeaderObject = {
  navItems: [
    navItem('The Weekend', '/the-weekend/'),
    navItem('Stay', '/stay/'),
    navItem('The Lodge', '/the-lodge/'),
    navItem('RSVP', '/rsvp/'),
    navItem('FAQ', '/faq/')
  ],
  addButton: true,
  button: mockButton('RSVP', navItem('RSVP', '/rsvp/').link)
};

/** Figma dates the wordmark "12.02.27" (node 1:46), so the weekend either side of it. */
const FALLBACK_START_DATE = '2027-02-12';
const FALLBACK_END_DATE = '2027-02-14';
const FALLBACK_VENUE_NAME = 'Kangaroo Valley';

/**
 * `socialMediaDocument.socials`, the third document the footer reads.
 *
 * Only the five values the Studio offers on `socialMediaItem` are valid here — `Icon` renders
 * nothing for a key it does not have, so a made-up platform would silently produce an empty link.
 */
const FALLBACK_SOCIALS: SocialsProps['socials'] = [
  { _key: 'instagram', name: 'instagram', link: 'https://instagram.com/loglee' },
  { _key: 'facebook', name: 'facebook', link: 'https://facebook.com/loglee' }
];

const headerFixture = globalFixture<IHeaderDocument>('header');
const settingsFixture = globalFixture<Partial<IWeddingSettingsDocument>>('weddingSettings');
const socialsFixture = globalFixture<{ socials?: SocialsProps['socials'] }>('socialMedia');

const header: IHeaderObject = headerFixture?.header?.navItems?.length ? headerFixture.header : FALLBACK_HEADER;
const startDate = settingsFixture?.startDate || FALLBACK_START_DATE;
const endDate = settingsFixture?.endDate || FALLBACK_END_DATE;
// Field by field, not object by object: the projection returns a shaped `venue` with null leaves for
// a document whose venue group is blank, so `settingsFixture?.venue ?? FALLBACK` would not fire.
const venueName = settingsFixture?.venue?.name || FALLBACK_VENUE_NAME;
const venue: IWeddingSettingsDocument['venue'] = { ...settingsFixture?.venue, name: venueName };
// Same field-by-field guard: `socials` comes back as `null` on a shaped-but-empty projection.
const socials = socialsFixture?.socials?.length ? socialsFixture.socials : FALLBACK_SOCIALS;

const navTitles = header.navItems.map((item) => item.title);

/**
 * The rendered strings, derived from the args rather than typed out.
 *
 * Load-bearing. The args prefer the live fixture over the constants above, so a hardcoded
 * "12–14 Feb 2027" is an assertion about the *fallback* pinned into a story that may not be using
 * it — and the moment anyone publishes `weddingSettings` and `story-fixture-checker` regenerates
 * `globals.json` during `/commit`, these stories fail with "expected '29–31 May 2026' to contain
 * '12–14 Feb 2027'". Publishing content must not break the suite. `formatDateRange` has its own
 * unit test for whether the formatting is right; what these assert is that the footer renders it.
 */
const DATE_RANGE = formatDateRange(startDate, endDate);
const DATE_SINGLE = formatDate(startDate);

/** The `<p>` holding the date-and-venue line, or `null` when the whole line is dropped. */
const detailsLine = (root: HTMLElement) => root.querySelector<HTMLParagraphElement>('footer p');

/**
 * A fixed-width column, so the footer's one breakpoint can be exercised without owning the window.
 *
 * The switch is a **container** query on the footer's own inline size, which in the app is the
 * viewport's — so constraining the wrapper is a faithful test of the same rule rather than a stand-in
 * for it. 23.4375rem is the design's 375px phone frame and the narrow anchor of every `fluid()`
 * token; 90rem is 1440px, the wide anchor and the desktop frame.
 */
const Column = ({ children, width }: { children: ReactNode; width: string }) => (
  <div style={{ width, minHeight: '18rem' }}>{children}</div>
);

const meta = {
  title: 'Navigation/Footer',
  component: Footer,
  tags: ['autodocs'],
  parameters: {
    /*
     * No `design` binding, and that is the point rather than an omission: every page frame in the
     * Figma file ends after its last content section. There is nothing to compare against, so
     * `/review-design` degrades to its token/compliance pass here.
     */
    // Site chrome is full-width, and a docs page otherwise caps it at the reading column.
    fullBleed: true,
    // `Logo` and every nav item render `next/link`, which needs the app router mock to exist.
    nextjs: { appDirectory: true, navigation: { pathname: '/' } }
  },
  args: { header, startDate, endDate, venue }
} satisfies Meta<typeof Footer>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The footer at desktop width: wordmark left, the five links right, the date and venue beneath.
 *
 * The list is asserted in full and in order, which is the check that matters here — these are the
 * header's `navItems`, rendered a second time from the same object, and `Header.stories.tsx` asserts
 * the identical array. Two lists that cannot disagree is the whole reason the footer takes
 * `IHeaderObject` instead of owning a `sitemap` field of its own.
 */
export const Desktop: Story = {
  decorators: [
    (Story) => (
      <Column width="90rem">
        <Story />
      </Column>
    )
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('contentinfo')).toBeVisible();

    const nav = canvas.getByRole('navigation', { name: 'Footer' });
    await expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => link.textContent)
    ).toEqual(navTitles);

    /*
     * The date and venue as one line, from two CMS fields.
     *
     * `toContain` rather than an equality, because the visible space between the two halves is the
     * flex `column-gap` and not a character — the only literal space in the line is the pair of
     * whitespace nodes flanking the `aria-hidden` separator, which exist so the text can be copied
     * and read as two things rather than one run.
     */
    const details = detailsLine(canvasElement);
    await expect(details).toBeVisible();
    await expect(details?.textContent).toContain(DATE_RANGE);
    await expect(details?.textContent).toContain(venueName);
  }
};

/**
 * The same footer in a 375px column.
 *
 * The assertion is that *nothing is hidden*. The header trades its link list for a hamburger below
 * its switch; this one has no disclosure at all, so every link and the whole detail line have to
 * still resolve through the accessibility tree at phone width — the container query moves the
 * wordmark above the list and changes nothing else.
 */
export const Mobile: Story = {
  decorators: [
    (Story) => (
      <Column width="23.4375rem">
        <Story />
      </Column>
    )
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const nav = canvas.getByRole('navigation', { name: 'Footer' });

    await expect(within(nav).getAllByRole('link')).toHaveLength(navTitles.length);
    for (const title of navTitles) {
      await expect(within(nav).getByRole('link', { name: title })).toBeVisible();
    }

    const details = detailsLine(canvasElement);
    await expect(details).toBeVisible();
    await expect(details?.textContent).toContain(venueName);
  }
};

/**
 * A one-day wedding — `endDate` left blank, which is a supported state rather than an error.
 *
 * The line renders a single date, not a range with a hole in it. Same guarantee in reverse if only
 * `endDate` is filled in; both are pinned in `tools/helpers/formatDateRange.test.ts`.
 */
export const SingleDate: Story = {
  args: { endDate: null },
  decorators: [
    (Story) => (
      <Column width="90rem">
        <Story />
      </Column>
    )
  ],
  play: async ({ canvasElement }) => {
    const details = detailsLine(canvasElement);

    await expect(details).toBeVisible();
    await expect(details?.textContent).toContain(DATE_SINGLE);
    // The single-date form is `formatDate`'s, so it can contain no dash of any kind.
    await expect(details?.textContent).not.toContain('–');
  }
};

/**
 * The venue named but no dates entered yet.
 *
 * Half a line is still a line: the separator only appears between two halves that both exist, so
 * this reads "Kangaroo Valley" and not "· Kangaroo Valley".
 */
export const WithoutDates: Story = {
  args: { startDate: null, endDate: null },
  decorators: [
    (Story) => (
      <Column width="90rem">
        <Story />
      </Column>
    )
  ],
  play: async ({ canvasElement }) => {
    const details = detailsLine(canvasElement);

    await expect(details).toBeVisible();
    await expect(details?.textContent?.trim()).toBe(venueName);
  }
};

/**
 * Nothing filled in on the wedding singleton at all.
 *
 * The line is absent rather than empty — no stray separator, no blank row holding open the stack's
 * gap. The wordmark and the links still stand on their own, which is the state a freshly set-up
 * project renders in.
 */
export const WithoutDetails: Story = {
  args: { startDate: null, endDate: null, venue: null },
  decorators: [
    (Story) => (
      <Column width="90rem">
        <Story />
      </Column>
    )
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(detailsLine(canvasElement)).toBeNull();
    await expect(within(canvas.getByRole('navigation', { name: 'Footer' })).getAllByRole('link')).toHaveLength(
      navTitles.length
    );
  }
};

/**
 * No header document to read, which is what an empty dataset returns.
 *
 * The nav element is not rendered at all rather than rendered empty — an unlabelled landmark
 * containing nothing is worse than no landmark, and `AccessibilityMenu`'s "Footer navigation" skip
 * link still lands on the `#footer` landmark either way.
 */
export const WithoutNavigation: Story = {
  args: { header: undefined },
  decorators: [
    (Story) => (
      <Column width="90rem">
        <Story />
      </Column>
    )
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.queryByRole('navigation')).not.toBeInTheDocument();
    await expect(canvas.getByRole('contentinfo')).toBeVisible();
    // The wordmark is a link home, and it is the only one left.
    await expect(canvas.getAllByRole('link')).toHaveLength(1);
  }
};

/**
 * The social icons, which come from a third document (`socialMediaDocument`) and are the one branch
 * of this component no other story reaches.
 *
 * It needs its own story rather than a line in `meta.args` because `Socials` renders `null` for an
 * empty document — so putting it everywhere would silently change the link counts the five stories
 * above assert, and the empty case is the one a freshly set-up project actually renders.
 *
 * Worth saying why this matters beyond coverage: stories *are* the component tests here, so with no
 * story passing `socials` neither `yarn test:stories` nor the a11y addon ever mounted these links,
 * and the `.socials` rule in the stylesheet was dead in every frame of the client-facing Storybook.
 */
export const WithSocials: Story = {
  args: { socials },
  decorators: [
    (Story) => (
      <Column width="90rem">
        <Story />
      </Column>
    )
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Named, not counted: an icon-only link whose accessible name went missing is the failure worth
    // catching, and `getByRole(name)` is the only assertion that sees it.
    for (const social of socials) {
      const link = canvas.getByRole('link', { name: social.name });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('href', social.link);
    }

    // The nav links are unaffected — the icons are a sibling row, not part of the list.
    const nav = canvas.getByRole('navigation', { name: 'Footer' });
    await expect(within(nav).getAllByRole('link')).toHaveLength(navTitles.length);
  }
};

/**
 * The landmark is the skip target.
 *
 * `AccessibilityMenu`'s third link points at `#footer`, and this asserts the thing it lands on is
 * the `contentinfo` element itself and that it is focusable. That pairing used to be a separate
 * zero-size `<a>` above the landmark, which resolved to an unnamed `generic` — focus moved, and a
 * screen reader announced nothing. Nothing in the suite would have noticed it disappearing.
 */
export const SkipTarget: Story = {
  decorators: [
    (Story) => (
      <Column width="90rem">
        <Story />
      </Column>
    )
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const footer = canvas.getByRole('contentinfo');

    await expect(footer).toHaveAttribute('id', 'footer');

    footer.focus();
    await expect(footer).toHaveFocus();
  }
};
