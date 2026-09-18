import { stegaClean, stegaEncodeSourceMap } from '@sanity/client/stega';
import type { ContentSourceMap } from '@sanity/client/stega';
import type { Decorator, Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import coupleNames from '@/helpers/coupleNames';
import formatDateRange from '@/helpers/formatDateRange';
import type { IHeroSection, IHeroWeddingSettings } from '@/tools/sanity/schema/sections/heroSection';
import globalFixture from '@/tools/storybook/globalFixture';
import mockSectionFields from '@/tools/storybook/mockSectionFields';
import sectionFixture from '@/tools/storybook/sectionFixture';

import HeroSection from '.';

import styles from './styles.module.scss';

const FIGMA = 'https://www.figma.com/design/KxvsJuCNaG4n2QVp3iD4jd/Wedding?node-id=';

/**
 * The home page's opening block. `parameters.design` points at the hero frame itself (node 1:63)
 * rather than the whole home page, so `/review-design` compares against what this section renders;
 * `Mobile` overrides it with the phone frame (1:112).
 */
const meta = {
  title: 'Sections/Hero',
  component: HeroSection,
  tags: ['autodocs'],
  parameters: {
    design: { type: 'figma', url: `${FIGMA}1-63` }
  }
} satisfies Meta<typeof HeroSection>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The section's props plus `sectionFields`, which the projection returns but `IHeroSection` does not declare. */
type HeroArgs = IHeroSection & { sectionFields?: ReturnType<typeof mockSectionFields> };

/**
 * A fixed width, so the container query resolves the same way whatever the test canvas is.
 *
 * `rem` and not `px`, matching `HeaderDisplaySection.stories`: the switch is `60rem`, so a `px`
 * wrapper would make these assertions depend on the reader's root font size. 80rem is the design's
 * 1280px desktop frame; 23.4375rem is 375px, the narrow anchor of every `fluid()` token and close to
 * the 390px phone frame.
 *
 * What a wrapper does *not* reproduce: `fluid()` interpolates on `vw`, so type and spacing are still
 * the canvas's rather than a 1280px window's. Layout is exact; the 176px names are not.
 */
const atWidth =
  (width: string): Decorator =>
  (Story) => (
    <div style={{ width }}>
      <Story />
    </div>
  );

/** The copy as drawn, in the case an editor types it — CSS does the uppercasing. */
const TRAVEL_NOTE = '90 min south of Sydney';

/**
 * The drawn copy, verbatim from nodes 1:65, 1:68 and 1:70.
 *
 * **Every story that asserts the comp's copy or geometry uses this, not the fixture** — the split
 * `HeaderDisplaySection.stories` and the rest of the section stories settled on, so publishing an
 * edit to the singleton cannot turn a layout test red.
 *
 * Case is the one deliberate departure: the comp types "THE LODGE JAMBEROO", and this passes the
 * venue as an editor stores it, so the uppercasing under test is the section's CSS rather than the
 * mock's shift key.
 */
const MOCK: IHeroSection = {
  weddingSettings: {
    coupleNames: { partnerOne: 'Sam', partnerTwo: 'Lauren' },
    startDate: '2027-02-12',
    endDate: '2027-02-14',
    venue: {
      name: 'The Lodge Jamberoo',
      address: '406 Jamberoo Mountain Rd\nJamberoo NSW 2533',
      travelNote: TRAVEL_NOTE
    }
  }
};

/*
 * The published singleton, in the shape the projection joins it.
 *
 * No page places a hero yet, so there is no section fixture — but the hero has no content of its
 * own, and everything it shows is already in `globals.json` as `weddingSettings`. The one field that
 * is not is `venue.travelNote`: it was added with this section, so no editor has filled it in, and
 * the story supplies the drawn line until one does. The moment it is published it arrives with the
 * rest (`WEDDING_SETTINGS_QUERY` projects `venue` whole) and the `??` below stops firing.
 *
 * Built field by field rather than spread, so the args are exactly what the projection would send —
 * no `mapUrl`, no `rsvpLabel`.
 */
const settingsFixture = globalFixture<IHeroWeddingSettings>('weddingSettings');

const PUBLISHED: IHeroSection | undefined = settingsFixture && {
  weddingSettings: {
    coupleNames: settingsFixture.coupleNames,
    startDate: settingsFixture.startDate,
    endDate: settingsFixture.endDate,
    venue: {
      name: settingsFixture.venue?.name,
      address: settingsFixture.venue?.address,
      travelNote: settingsFixture.venue?.travelNote ?? TRAVEL_NOTE
    }
  }
};

/**
 * Real data, most specific first: a `heroSection` fixture once a page places one (it carries the
 * projection's own join), the published singleton until then, and the comp only if the dataset loses
 * both.
 */
const data: IHeroSection = sectionFixture<IHeroSection>('heroSection') ?? PUBLISHED ?? MOCK;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/*
 * The two meta lines, by the component's own hashed module class — the story and the component
 * import the same stylesheet, so `styles.summary` is the same generated name in dev, in a static
 * build and under Vitest.
 */
const summaryIn = (root: HTMLElement) => root.querySelector<HTMLElement>(`.${styles.summary}`);
const directionsIn = (root: HTMLElement) => root.querySelector<HTMLElement>(`.${styles.directions}`);
const streetIn = (root: HTMLElement) => root.querySelector<HTMLElement>(`.${styles.street}`);
const metaIn = (root: HTMLElement) => root.querySelector<HTMLElement>(`.${styles.meta}`);

/**
 * A line's text as a reader would copy it: whitespace runs — including the no-break space before
 * each separator — collapsed to one space, and any stega payload removed.
 */
const lineText = (element: Element | null) =>
  stegaClean(element?.textContent ?? '')
    .replaceAll(/\s+/g, ' ')
    .trim();

/** What a line is expected to read: the halves that exist, and a separator only between two of them. */
const joined = (...halves: (string | null | undefined)[]) => halves.filter(Boolean).join(' · ');

const rect = (element: Element) => element.getBoundingClientRect();

/**
 * A string as `sanityFetch` delivers it in draft mode, encoded by the client itself — the same
 * construction `tools/helpers/hasText.test.ts` uses, so this follows whatever the installed
 * `@sanity/client` emits rather than a hand-typed run of zero-width characters.
 */
const draft = (value: string, path: string): string => {
  const resultSourceMap: ContentSourceMap = {
    documents: [{ _id: 'drafts.weddingSettings', _type: 'weddingSettings' }],
    paths: [path],
    mappings: { "$['value']": { type: 'value', source: { type: 'documentValue', document: 0, path: 0 } } }
  };

  return stegaEncodeSourceMap({ value }, resultSourceMap, { enabled: true, studioUrl: '/studio' }).value;
};

/** `MOCK` with some of its singleton's fields replaced — the shape every blank-state story needs. */
const withSettings = (overrides: IHeroWeddingSettings): IHeroSection => ({
  weddingSettings: { ...MOCK.weddingSettings, ...overrides }
});

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/**
 * **The section rendered against whatever is published today**, at the canvas's own width.
 *
 * Every assertion is read out of `data` — the heading from its names, each meta line from its dates
 * and venue — never written against the drawn copy. That is what makes this the story that proves the
 * hero shows what the singleton says, which is the AC: edit a name in Wedding Settings and this is
 * where it shows.
 *
 * No decorator, so this is also the story to resize and to screenshot at a stated viewport.
 */
export const PublishedContent: Story = {
  args: data,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const settings = data.weddingSettings;
    const street = settings?.venue?.address?.split(/\r?\n/).find((line) => line.trim());
    const expectedSummary = joined(
      formatDateRange(settings?.startDate, settings?.endDate, { style: 'numeric' }),
      settings?.venue?.name?.trim()
    );
    const expectedDirections = joined(street?.trim(), settings?.venue?.travelNote?.trim());

    /*
     * Not vacuous. `data` is published content or the comp, and both have a date and a venue — an
     * empty line here means the dataset lost its content, which is worth failing on rather than
     * passing silently.
     */
    await expect(expectedSummary.length).toBeGreaterThan(0);

    // The names are the page `h1`, joined exactly as the shared helper joins them.
    await expect(lineText(canvas.getByRole('heading', { level: 1 }))).toBe(coupleNames(settings?.coupleNames));
    await expect(lineText(summaryIn(canvasElement))).toBe(expectedSummary);
    // `textContent`, so the street counts even at a width where the phone layout hides it.
    await expect(lineText(directionsIn(canvasElement))).toBe(expectedDirections);
  }
};

/**
 * The drawn hero at the canvas's own width — on `MOCK`, so the copy below stays a fact about the
 * design.
 */
export const Default: Story = {
  args: MOCK,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const heading = canvas.getByRole('heading', { level: 1 });
    const [first, second] = [...heading.children];

    // AC: the names are the page's `h1`, and its accessible text reads as one phrase.
    await expect(lineText(heading)).toBe('Sam & Lauren');
    // Stacked as drawn: "SAM &" on one line, "LAUREN" on the next.
    await expect(lineText(first)).toBe('Sam &');
    await expect(lineText(second)).toBe('Lauren');
    await expect(rect(second).top).toBeGreaterThan(rect(first).top);

    await expect(lineText(summaryIn(canvasElement))).toBe('12–14.02.27 · The Lodge Jamberoo');
    await expect(lineText(directionsIn(canvasElement))).toBe('406 Jamberoo Mountain Rd · 90 min south of Sydney');
  }
};

/**
 * Desktop: the meta row splits — dates and venue on the left, street and travel note on the right,
 * sharing one bottom edge (node 1:66 is `items-end` / `justify-between`).
 *
 * 80rem is the 1280px frame, pinned as a wrapper so the container query resolves the same way in the
 * component-test runner as it does here.
 */
export const Desktop: Story = {
  args: MOCK,
  decorators: [atWidth('80rem')],
  play: async ({ canvasElement }) => {
    const heading = within(canvasElement).getByRole('heading', { level: 1 });
    const meta = metaIn(canvasElement) as HTMLElement;
    const summary = summaryIn(canvasElement) as HTMLElement;
    const directions = directionsIn(canvasElement) as HTMLElement;

    await expect(getComputedStyle(meta).flexDirection).toBe('row');
    // The street is on the desktop line.
    await expect(streetIn(canvasElement)).toBeVisible();

    // Left half under the names, right half against the content edge, both on one bottom edge.
    await expect(rect(summary).left).toBeCloseTo(rect(heading).left, 0);
    await expect(rect(directions).right).toBeCloseTo(rect(meta).right, 0);
    await expect(rect(directions).bottom).toBeCloseTo(rect(summary).bottom, 0);
  }
};

/**
 * Mobile: the meta stacks into two lines and the street drops out, keeping the travel note (node
 * 1:112) — the AC's "mobile drops the street address and keeps the travel line".
 *
 * A width rather than a viewport, deliberately: the reflow is a container query, so a story that
 * reached it by shrinking the window would pass just as well against the viewport media query this
 * is not.
 */
export const Mobile: Story = {
  args: MOCK,
  decorators: [atWidth('23.4375rem')],
  parameters: { design: { type: 'figma', url: `${FIGMA}1-112` } },
  play: async ({ canvasElement }) => {
    const meta = metaIn(canvasElement) as HTMLElement;
    const summary = summaryIn(canvasElement) as HTMLElement;
    const directions = directionsIn(canvasElement) as HTMLElement;

    await expect(getComputedStyle(meta).flexDirection).toBe('column');

    // The street is dropped, and the separator after it goes with it.
    await expect(streetIn(canvasElement)).not.toBeVisible();
    await expect(directions).toBeVisible();
    /*
     * `innerText`, not `textContent`, and the directive is what stops `yarn fix` swapping one for
     * the other — it did, once, and the story went red for a reason that read like a layout bug.
     * `innerText` is the *rendered* text: it skips the `display: none` street and applies the
     * uppercasing, which together are the assertion. `textContent` reads the hidden street back.
     */
    // eslint-disable-next-line unicorn/prefer-dom-node-text-content -- the rendered text is what is under test
    await expect(directions.innerText.trim()).toBe(TRAVEL_NOTE.toUpperCase());

    // Two lines, left-aligned under each other.
    await expect(rect(directions).left).toBeCloseTo(rect(summary).left, 0);
    await expect(rect(directions).top).toBeGreaterThanOrEqual(rect(summary).bottom);
  }
};

/**
 * One partner only — the second left blank. The AC: no dangling ampersand.
 */
export const OnePartner: Story = {
  args: withSettings({ coupleNames: { partnerOne: 'Sam', partnerTwo: '' } }),
  play: async ({ canvasElement }) => {
    const heading = within(canvasElement).getByRole('heading', { level: 1 });

    await expect(lineText(heading)).toBe('Sam');
    await expect(heading.children).toHaveLength(1);
  }
};

/**
 * No dates yet: the left line is the venue alone, with no separator in front of it.
 */
export const WithoutDates: Story = {
  args: withSettings({ startDate: null, endDate: null }),
  play: async ({ canvasElement }) => {
    await expect(lineText(summaryIn(canvasElement))).toBe('The Lodge Jamberoo');
  }
};

/**
 * No venue at all: the left line is the dates alone, and the right line — every part of which is the
 * venue's — is not rendered rather than rendered empty.
 */
export const WithoutVenue: Story = {
  args: withSettings({ venue: null }),
  play: async ({ canvasElement }) => {
    await expect(lineText(summaryIn(canvasElement))).toBe('12–14.02.27');
    await expect(directionsIn(canvasElement)).toBeNull();
  }
};

/**
 * No travel note, desktop: the right line is the street alone, with no separator after it.
 */
export const WithoutTravelNote: Story = {
  args: withSettings({ venue: { ...MOCK.weddingSettings?.venue, travelNote: null } }),
  decorators: [atWidth('80rem')],
  play: async ({ canvasElement }) => {
    const directions = directionsIn(canvasElement) as HTMLElement;

    await expect(directions).toBeVisible();
    await expect(lineText(directions)).toBe('406 Jamberoo Mountain Rd');
  }
};

/**
 * No travel note, phone: the street is the only thing on the right line and the phone layout drops
 * the street, so the whole line goes — and takes no space. An empty `<p>` left in the stack would
 * still claim the 8px gap beneath the dates.
 */
export const WithoutTravelNoteMobile: Story = {
  args: withSettings({ venue: { ...MOCK.weddingSettings?.venue, travelNote: null } }),
  decorators: [atWidth('23.4375rem')],
  parameters: { design: { type: 'figma', url: `${FIGMA}1-112` } },
  play: async ({ canvasElement }) => {
    const meta = metaIn(canvasElement) as HTMLElement;
    const summary = summaryIn(canvasElement) as HTMLElement;

    await expect(directionsIn(canvasElement)).not.toBeVisible();
    // The meta row ends where the dates line does.
    await expect(rect(meta).bottom).toBeCloseTo(rect(summary).bottom, 0);
  }
};

/**
 * No address: the right line is the travel note alone, with no separator in front of it.
 */
export const WithoutAddress: Story = {
  args: withSettings({ venue: { ...MOCK.weddingSettings?.venue, address: null } }),
  decorators: [atWidth('80rem')],
  play: async ({ canvasElement }) => {
    await expect(lineText(directionsIn(canvasElement))).toBe(TRAVEL_NOTE);
    await expect(streetIn(canvasElement)).toBeNull();
  }
};

/**
 * The names with nothing else filled in. The meta row is not rendered at all rather than rendered
 * empty, so there is no stray padding under the heading.
 */
export const NamesOnly: Story = {
  args: withSettings({ startDate: null, endDate: null, venue: null }),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('heading', { level: 1 })).toBeInTheDocument();
    await expect(metaIn(canvasElement)).toBeNull();
  }
};

/**
 * The singleton missing entirely — what the projection returns before anyone has created it.
 *
 * The heading falls back to both names rather than rendering an empty `h1`, which is the shared
 * helper's rule and the one the thank-you page has always followed. See `FALLBACK_PARTNERS` in
 * `tools/helpers/coupleNames.ts`.
 */
export const WithoutSettings: Story = {
  args: { weddingSettings: null },
  play: async ({ canvasElement }) => {
    await expect(lineText(within(canvasElement).getByRole('heading', { level: 1 }))).toBe('Sam & Lauren');
    await expect(metaIn(canvasElement)).toBeNull();
  }
};

// The second partner, the venue name and the travel note, all blank — as a draft delivers blanks.
const DRAFT_BLANKS: IHeroWeddingSettings = {
  coupleNames: { partnerOne: 'Sam', partnerTwo: draft('', "$['coupleNames']['partnerTwo']") },
  venue: {
    name: draft('   ', "$['venue']['name']"),
    address: '406 Jamberoo Mountain Rd\nJamberoo NSW 2533',
    travelNote: draft('', "$['venue']['travelNote']")
  }
};

/**
 * Blank fields as the Presentation tool delivers them — stega-encoded, so a plain `.trim()` test
 * reads each one as filled in.
 *
 * The second partner, the venue name and the travel note are all blank here, and each arrives as a
 * run of invisible characters. Tested the naive way, that is "SAM &", "12–14.02.27 ·" and
 * "406 JAMBEROO MOUNTAIN RD ·": every dangling mark the AC rules out, in the one view an editor
 * checks their work in. `hasText` sees through the encoding.
 */
export const DraftBlankFields: Story = {
  args: withSettings(DRAFT_BLANKS),
  decorators: [atWidth('80rem')],
  play: async ({ canvasElement }) => {
    // The trap is real first: every blank here is non-empty to a plain `.trim()`.
    await expect(DRAFT_BLANKS.coupleNames?.partnerTwo?.trim()).not.toBe('');
    await expect(DRAFT_BLANKS.venue?.name?.trim()).not.toBe('');
    await expect(DRAFT_BLANKS.venue?.travelNote?.trim()).not.toBe('');

    await expect(lineText(within(canvasElement).getByRole('heading', { level: 1 }))).toBe('Sam');
    await expect(lineText(summaryIn(canvasElement))).toBe('12–14.02.27');
    await expect(lineText(directionsIn(canvasElement))).toBe('406 Jamberoo Mountain Rd');
  }
};

/**
 * Names long enough to wrap at a phone width.
 *
 * The display tier's floor is 64px, so a long name does not fit a 335px measure and has to break
 * somewhere. What this pins is *where*: the ampersand may take a line of its own, but nothing may run
 * past the content edge — no horizontal scroll (WCAG 1.4.10), with `overflow-wrap` as the backstop
 * for a single word longer than the measure.
 */
export const LongNames: Story = {
  args: withSettings({ coupleNames: { partnerOne: 'Alexandra', partnerTwo: 'Christopherson' } }),
  decorators: [atWidth('23.4375rem')],
  parameters: { design: { type: 'figma', url: `${FIGMA}1-112` } },
  play: async ({ canvasElement }) => {
    const heading = within(canvasElement).getByRole('heading', { level: 1 });

    await expect(lineText(heading)).toBe('Alexandra & Christopherson');
    // Half a pixel of slack for sub-pixel layout.
    await expect(heading.scrollWidth).toBeLessThanOrEqual(heading.clientWidth + 0.5);
  }
};

/**
 * A travel note long enough that the right half no longer fits beside the left.
 *
 * It moves beneath the dates *whole* and stays on the right edge, rather than squeezing both halves
 * into ragged columns — `flex-wrap` plus `.directions`' `margin-inline-start: auto`.
 */
export const LongDirections: Story = {
  args: withSettings({
    venue: {
      ...MOCK.weddingSettings?.venue,
      travelNote: '90 min south of Sydney, 2 hrs from Canberra, 25 min from Wollongong station by taxi'
    }
  }),
  decorators: [atWidth('80rem')],
  play: async ({ canvasElement }) => {
    const meta = metaIn(canvasElement) as HTMLElement;
    const summary = summaryIn(canvasElement) as HTMLElement;
    const directions = directionsIn(canvasElement) as HTMLElement;

    // On its own line beneath the dates…
    await expect(rect(directions).top).toBeGreaterThanOrEqual(rect(summary).bottom);
    // …still against the right edge, and inside the content box.
    await expect(rect(directions).right).toBeCloseTo(rect(meta).right, 0);
    await expect(rect(directions).left).toBeGreaterThanOrEqual(rect(meta).left);
  }
};

const DARK: HeroArgs = { ...MOCK, sectionFields: mockSectionFields({ theme: 'dark' }) };

/**
 * The dark theme, set per placement through `sectionFields` like every section.
 *
 * Asserts the inks come from the theme rather than from the stylesheet: the names and the dates
 * line take the section's default ink, and the mono line the accent — each compared against a probe
 * that resolves the same custom property inside the same section, so a hard-coded colour anywhere in
 * the chain fails here.
 */
export const Dark: Story = {
  args: DARK,
  decorators: [atWidth('80rem')],
  play: async ({ canvasElement }) => {
    const section = canvasElement.querySelector('section') as HTMLElement;
    const probe = document.createElement('span');

    await expect(section.dataset.theme).toBe('dark');

    probe.style.color = 'var(--fg-accent)';
    section.append(probe);

    try {
      const accent = getComputedStyle(probe).color;
      const ink = getComputedStyle(section).color;

      await expect(getComputedStyle(within(canvasElement).getByRole('heading', { level: 1 })).color).toBe(ink);
      await expect(getComputedStyle(summaryIn(canvasElement) as HTMLElement).color).toBe(ink);
      await expect(getComputedStyle(directionsIn(canvasElement) as HTMLElement).color).toBe(accent);
      // Two distinct inks, so the two assertions above cannot both pass by accident.
      await expect(accent).not.toBe(ink);
    } finally {
      probe.remove();
    }
  }
};
