import type { Decorator, Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, waitFor, within } from 'storybook/test';

import hasDestination from '@/helpers/hasDestination';
import hasText from '@/helpers/hasText';
import resolveRsvpAction from '@/helpers/rsvpAction';
import type { RsvpActionFields } from '@/helpers/rsvpAction';
import type { IHeaderDocument } from '@/tools/sanity/schema/documents/headerDocument';
import type { IWeddingSettingsDocument } from '@/tools/sanity/schema/documents/weddingSettings';
import type { IClosingCtaSection } from '@/tools/sanity/schema/sections/closingCtaSection';
import globalFixture from '@/tools/storybook/globalFixture';
import { mockBlock } from '@/tools/storybook/mockBlockContent';
import mockButton from '@/tools/storybook/mockButton';
import mockLink from '@/tools/storybook/mockLink';
import sectionFixture from '@/tools/storybook/sectionFixture';

import ClosingCtaSection from '.';

import styles from './styles.module.scss';

const FIGMA = 'https://www.figma.com/design/KxvsJuCNaG4n2QVp3iD4jd/Wedding?node-id=';

/**
 * The home page's closing block — the intro on the left, "The Weekend" and the RSVP action on the
 * right. `parameters.design` is the desktop band (node 1:71); `Mobile` rebinds to the phone band.
 */
const meta = {
  title: 'Sections/Closing CTA',
  component: ClosingCtaSection,
  tags: ['autodocs'],
  parameters: {
    design: { type: 'figma', url: `${FIGMA}1-71` },
    /*
     * The widths the stories below pin — see `DESKTOP` and its neighbours. `@storybook/addon-vitest`
     * resolves a viewport global against this list and the toolbar offers it.
     *
     * Written out rather than spread from `storybook/viewport`'s `MINIMAL_VIEWPORTS`: that import is a
     * dependency nothing else in the repo pulls in, and Vite discovering one mid-run re-optimises and
     * reloads the test browser, failing every story in the file on the first run against a warm cache.
     */
    viewport: {
      options: {
        desktop: { name: 'Desktop (1280px, the comp)', styles: { height: '1024px', width: '1280px' }, type: 'desktop' },
        tablet: { name: 'Tablet (834px)', styles: { height: '1112px', width: '834px' }, type: 'tablet' },
        tabletEdge: { name: 'Narrowest tablet (769px)', styles: { height: '900px', width: '769px' }, type: 'tablet' },
        phoneEdge: { name: 'Widest phone (768px)', styles: { height: '900px', width: '768px' }, type: 'mobile' },
        phone: { name: 'Phone (414px)', styles: { height: '896px', width: '414px' }, type: 'mobile' }
      }
    }
  }
} satisfies Meta<typeof ClosingCtaSection>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * A fixed width, so the row's container query resolves the same way whatever the test canvas is.
 * `rem`, matching the other section stories: the switch is `60rem`, so a `px` wrapper would make the
 * layout under test depend on the root font size.
 */
const atWidth =
  (width: string): Decorator =>
  (Story) => (
    <div style={{ width }}>
      <Story />
    </div>
  );

/*
 * Viewports, for the stories whose assertions depend on one.
 *
 * The phone treatment — the secondary action leaving, the RSVP action spanning the column — is a
 * viewport query, not a container one (see the head of the stylesheet), so a narrow wrapper alone does
 * not reach it and a wide wrapper alone does not rule it out. A story that asserts either side of it
 * pins the viewport through the global, which `@storybook/addon-vitest` applies to the test browser
 * before the story renders and the Storybook UI applies to the canvas. The sizes are declared on
 * `meta`: `desktop` is the comp's 1280px frame, `tablet` 834px, `phone` the 414px phone
 * `/review-design` measures at, and the two edges sit either side of the breakpoint.
 *
 * The stories without one assert nothing that depends on the window, so they hold at any width.
 */
const DESKTOP = { viewport: { value: 'desktop', isRotated: false } };
const TABLET = { viewport: { value: 'tablet', isRotated: false } };
const PHONE = { viewport: { value: 'phone', isRotated: false } };
const PHONE_EDGE = { viewport: { value: 'phoneEdge', isRotated: false } };
const TABLET_EDGE = { viewport: { value: 'tabletEdge', isRotated: false } };

const internalLink = (title: string, pathname: string) =>
  mockLink({ internalLink: { title, slug: { current: pathname }, pathname } });

/*
 * The RSVP action, from the same two documents the projection joins it from.
 *
 * The reply-by line is the published one — "RSVP by 11 December" in `globals.json`. The comp's
 * "RSVP by 01.12.26" is stale design copy, and the content wins; the comp's line is only the fallback
 * for a dataset that loses the field, as it is in `Header.stories`.
 *
 * The header document is not published yet, so its action is a shaped stand-in until it is. The guard
 * tests the fields this story uses rather than the object, because a projection returns a shaped
 * object with null leaves for a document whose fields are blank.
 */
const settingsFixture = globalFixture<Partial<IWeddingSettingsDocument>>('weddingSettings');
const headerFixture = globalFixture<IHeaderDocument>('header');

const RSVP: RsvpActionFields = {
  rsvpLabel: settingsFixture?.rsvpLabel || 'RSVP by 01.12.26',
  ...(headerFixture?.header?.addButton && headerFixture.header.button
    ? { addButton: headerFixture.header.addButton, button: headerFixture.header.button }
    : { addButton: true, button: mockButton('RSVP', internalLink('RSVP', '/rsvp/')) })
};

/** What the RSVP button reads for a given `rsvp`, worked out the way the section works it out. */
const rsvpLabelOf = (rsvp?: RsvpActionFields | null) => resolveRsvpAction(rsvp)?.longLabel ?? '';

const INTRO =
  'Three days among the pines by the Minnamurra River. Arrive Friday, marry Saturday, recover Sunday. Everyone stays on site.';

/**
 * The drawn band, verbatim from node 1:71 — the intro, and "The Weekend" pointed at the published
 * `/weekend/` page.
 *
 * **Every story that asserts the comp's copy, count or geometry uses this, not a fixture**, so a
 * published edit to the home page cannot break an assertion about the design. The RSVP label is the
 * exception by construction: it is never the comp's, it is whatever the content says, and every story
 * derives it through `rsvpLabelOf` rather than writing it down.
 */
const MOCK: IClosingCtaSection = {
  content: [mockBlock('normal', INTRO)],
  addButton: true,
  button: mockButton('The Weekend', internalLink('The Weekend', '/weekend/')),
  showRsvp: true,
  rsvp: RSVP
};

/*
 * Real data, falling back to the mock. No published page places this section yet, so today this is
 * `MOCK` — with the published reply-by line already in it. Once the home page is built,
 * `yarn storybook:fixtures` writes the instance, joined `rsvp` and all, and this picks it up.
 */
const PUBLISHED = sectionFixture<IClosingCtaSection>('closingCtaSection') ?? MOCK;

/**
 * Where a paragraph's last line ends: its content box, not the paragraph spacing padded below it. The
 * border box would move with that padding and so could never catch it.
 */
const lastLineBottom = (element: HTMLElement) =>
  element.getBoundingClientRect().bottom - Number.parseFloat(getComputedStyle(element).paddingBottom);

/**
 * The section's elements, found by the module's own class names — not by position, which would break
 * silently the day `Section` or `Container` gains a wrapper. `actions` is `null` when none is drawn.
 */
const partsOf = (canvasElement: HTMLElement) => ({
  actions: canvasElement.querySelector<HTMLElement>(`.${styles.actions}`),
  row: canvasElement.querySelector<HTMLElement>(`.${styles.row}`) as HTMLElement,
  section: canvasElement.querySelector<HTMLElement>('[data-name="ClosingCtaSection"]') as HTMLElement
});

/**
 * **The section on whatever is in the dataset today**, at the canvas's own width.
 *
 * Every assertion is read out of `PUBLISHED`: the paragraph, which actions exist, and what each one
 * says. That is the complement to `Default`, which pins the comp — so this is the story that proves
 * the section survives whatever an editor publishes.
 *
 * Two details keep it honest against real content. The actions are read inside their own wrapper,
 * because the intro is rich text and may carry a link of its own. And they are read with
 * `hidden: true`, so the check is of what the section rendered and holds at a phone width too, where
 * the secondary action can be in the DOM but not displayed.
 *
 * The expectation is worked out here from the data rather than by calling a function the component
 * also calls. Deliberately: a test that computes its answer with the code under test agrees with it by
 * construction, including when both are wrong.
 */
export const PublishedContent: Story = {
  args: PUBLISHED,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const { actions } = partsOf(canvasElement);
    const { addButton, button, content, showRsvp, rsvp } = PUBLISHED;
    const rsvpAction = showRsvp === false ? undefined : resolveRsvpAction(rsvp);

    // Each paragraph as the editor wrote it. Matched on the whole paragraph's text, because a bold or
    // linked run splits it across elements and `getByText` alone reads only direct text nodes.
    for (const block of content ?? []) {
      const text = (block.children ?? []).map((child) => child.text ?? '').join('');
      if (hasText(text)) {
        await expect(
          canvas.getByText((_, element) => element?.tagName === 'P' && element.textContent === text)
        ).toBeVisible();
      }
    }

    // The actions the section should draw from this data, filtered the way the section filters them.
    const expected = [
      addButton && hasText(button?.label) && hasDestination(button?.link) ? button?.label : undefined,
      rsvpAction && hasDestination(rsvpAction.link) ? rsvpAction.longLabel : undefined
    ].filter(Boolean);

    // Not vacuous: `PUBLISHED` is the fixture or `MOCK`, and either carries at least the RSVP action.
    await expect(expected.length).toBeGreaterThan(0);
    await expect(
      within(actions as HTMLElement)
        .getAllByRole('link', { hidden: true })
        .map((link) => link.textContent)
    ).toEqual(expected);
  }
};

/**
 * The drawn band at the canvas's own width, on `MOCK`.
 *
 * AC: the RSVP button reads the reply-by line from Wedding Settings — the same field, through the same
 * helper, as the header pill — and goes where the header's action goes. `hidden: true` for the same
 * reason as `PublishedContent`: this is about what is rendered and in what order, at any width.
 */
export const Default: Story = {
  args: MOCK,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const links = canvas.getAllByRole('link', { hidden: true });

    await expect(canvas.getByText(INTRO)).toBeVisible();
    // Two actions, in the comp's order, which is also the tab order.
    await expect(links.map((link) => link.textContent)).toEqual(['The Weekend', rsvpLabelOf(MOCK.rsvp)]);
    await expect(links[0]).toHaveAttribute('href', '/weekend/');
    await expect(links[1]).toHaveAttribute('href', MOCK.rsvp?.button?.link?.internalLink?.pathname);
  }
};

/**
 * Desktop: the intro and the actions side by side, sharing one bottom edge, the intro held to the
 * comp's measure and the actions against the right edge (node 1:71).
 *
 * The comp's 1280px frame, as a viewport and as the column — so the fluid type and spacing resolve at
 * 1280 as well as the layout.
 */
export const Desktop: Story = {
  args: MOCK,
  decorators: [atWidth('80rem')],
  globals: DESKTOP,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const { row } = partsOf(canvasElement);
    const paragraph = canvas.getByText(INTRO);
    const intro = paragraph.parentElement as HTMLElement;
    const rsvp = canvas.getByRole('link', { name: rsvpLabelOf(MOCK.rsvp) });

    // Polled: a container query cannot resolve before its container has been laid out, so the first
    // frame is the stacked default.
    await waitFor(() => expect(getComputedStyle(row).flexDirection).toBe('row'));

    // The composition: the actions hang off the paragraph's last line, not its first. Measured on the
    // paragraph's text rather than its wrapper, which `flex-end` aligns whatever padding sits inside it.
    await expect(rsvp.getBoundingClientRect().bottom).toBeCloseTo(lastLineBottom(paragraph), 0);
    // Held to the measure rather than running across the row.
    await expect(intro.getBoundingClientRect().width).toBeLessThanOrEqual(
      Number.parseFloat(getComputedStyle(intro).maxInlineSize) + 0.5
    );
    // Against the right edge of the content box.
    await expect(rsvp.getBoundingClientRect().right).toBeCloseTo(row.getBoundingClientRect().right, 0);
    await expect(canvas.getByRole('link', { name: 'The Weekend' })).toBeVisible();
  }
};

/**
 * Mobile: the intro, then the RSVP action alone and full width (node 1:119).
 *
 * **A real viewport, not only a narrow column.** Stacking is a container query and a narrow column
 * would reach it, but the phone treatment is keyed to the viewport breakpoint `Button`'s
 * `fullWidthMobile` uses — see `PHONE` above.
 *
 * On the autodocs page, which has no viewport of its own, this renders in the 414px column below and
 * shows the stacked tablet layout instead. Open the story itself to see the phone.
 */
export const Mobile: Story = {
  args: MOCK,
  decorators: [atWidth('25.875rem')],
  globals: PHONE,
  parameters: { design: { type: 'figma', url: `${FIGMA}1-119` } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const { row } = partsOf(canvasElement);
    const rsvp = canvas.getByRole('link', { name: rsvpLabelOf(MOCK.rsvp) });

    await waitFor(() => expect(getComputedStyle(row).flexDirection).toBe('column'));

    // AC: one action. `display: none` takes the secondary out of the accessibility tree, which is what
    // a role query reads — so this is the screen reader's view as well as the eye's.
    await expect(canvas.getAllByRole('link')).toHaveLength(1);
    await expect(canvas.queryByRole('link', { name: 'The Weekend' })).not.toBeInTheDocument();

    // AC: full width. Beneath the intro, spanning the column.
    await expect(rsvp.getBoundingClientRect().width).toBeCloseTo(row.getBoundingClientRect().width, 0);
    await expect(rsvp.getBoundingClientRect().top).toBeGreaterThan(
      canvas.getByText(INTRO).getBoundingClientRect().bottom
    );
  }
};

/**
 * Between the two: a tablet, where the row no longer fits but the viewport is still wider than a
 * phone. The comp draws no frame here; the intro sits above both actions, which start under its first
 * letter.
 *
 * An 834px viewport and column: its ~777px content box is below the 60rem switch, and the window is
 * above the `tablet` breakpoint the phone treatment starts at.
 */
export const Tablet: Story = {
  args: MOCK,
  decorators: [atWidth('52.125rem')],
  globals: TABLET,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const { row } = partsOf(canvasElement);
    const intro = canvas.getByText(INTRO).parentElement as HTMLElement;

    await waitFor(() => expect(getComputedStyle(row).flexDirection).toBe('column'));

    const [secondary, rsvp] = canvas.getAllByRole('link');
    await expect(secondary).toHaveTextContent('The Weekend');
    await expect(secondary.getBoundingClientRect().left).toBeCloseTo(intro.getBoundingClientRect().left, 0);
    // Side by side at their own widths — not the phone's full-width action.
    await expect(rsvp.getBoundingClientRect().top).toBeCloseTo(secondary.getBoundingClientRect().top, 0);
    await expect(rsvp.getBoundingClientRect().width).toBeLessThan(row.getBoundingClientRect().width / 2);
  }
};

/*
 * The two halves of the phone treatment — the secondary action leaving, the RSVP action spanning the
 * column — are separate rules in separate stylesheets that both name the `tablet` breakpoint: this
 * section's `.phoneHidden`, and `Button`'s `.fullWidthMobile`. `PhoneEdge` and `TabletEdge` sit one
 * pixel either side of it and assert *both* halves at once, so moving either rule's breakpoint without
 * the other fails one of them. `Mobile` and `Tablet` alone could not: 414 and 834 are far enough from
 * the edge that each would still pass.
 */
const phoneTreatment = async (canvasElement: HTMLElement) => {
  const { actions, row } = partsOf(canvasElement);
  const rsvp = within(actions as HTMLElement).getByRole('link', { name: rsvpLabelOf(MOCK.rsvp) });

  await waitFor(() => expect(getComputedStyle(row).flexDirection).toBe('column'));

  return {
    rsvpSpansRow: Math.abs(rsvp.getBoundingClientRect().width - row.getBoundingClientRect().width) < 0.5,
    secondaryShown: within(actions as HTMLElement).queryByRole('link', { name: 'The Weekend' }) !== null
  };
};

/** 768px, the widest phone: the RSVP action alone, full width. */
export const PhoneEdge: Story = {
  args: MOCK,
  decorators: [atWidth('48rem')],
  globals: PHONE_EDGE,
  play: async ({ canvasElement }) => {
    await expect(await phoneTreatment(canvasElement)).toEqual({ rsvpSpansRow: true, secondaryShown: false });
  }
};

/** 769px, the narrowest tablet: both actions back, each at its own width. */
export const TabletEdge: Story = {
  args: MOCK,
  decorators: [atWidth('48.0625rem')],
  globals: TABLET_EDGE,
  play: async ({ canvasElement }) => {
    await expect(await phoneTreatment(canvasElement)).toEqual({ rsvpSpansRow: false, secondaryShown: true });
  }
};

/**
 * A phone with no RSVP action — switched off here, or off in the header once replies close — and the
 * secondary action on.
 *
 * The phone treatment is about the RSVP action standing alone, so with none there is nothing to make
 * room for and "The Weekend" stays. Hiding it anyway left an empty actions wrapper holding the row's
 * gap open under the intro, and would have taken the section's one way onward off the page.
 */
export const SecondaryOnlyPhone: Story = {
  args: { ...MOCK, showRsvp: false },
  decorators: [atWidth('25.875rem')],
  globals: PHONE,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const { actions, row } = partsOf(canvasElement);
    const secondary = canvas.getByRole('link', { name: 'The Weekend' });

    await waitFor(() => expect(getComputedStyle(row).flexDirection).toBe('column'));

    await expect(secondary).toBeVisible();
    // No orphaned gap: the wrapper under the intro holds exactly the action it shows.
    await expect(actions?.getBoundingClientRect().height).toBeCloseTo(secondary.getBoundingClientRect().height, 0);
  }
};

/**
 * AC: no secondary button — switched off, with the button an editor filled in still in the document,
 * because a Sanity `hidden` predicate only hides the field. The RSVP action keeps its place against
 * the right edge with nothing beside it.
 */
export const WithoutSecondary: Story = {
  args: { ...MOCK, addButton: false },
  decorators: [atWidth('80rem')],
  globals: DESKTOP,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const { row } = partsOf(canvasElement);
    const rsvp = canvas.getByRole('link', { name: rsvpLabelOf(MOCK.rsvp) });

    await waitFor(() => expect(getComputedStyle(row).flexDirection).toBe('row'));

    await expect(canvas.getAllByRole('link')).toHaveLength(1);
    // No orphaned gap: the action is the only thing in its wrapper and still meets the right edge.
    await expect(rsvp.parentElement?.children).toHaveLength(1);
    await expect(rsvp.getBoundingClientRect().right).toBeCloseTo(row.getBoundingClientRect().right, 0);
  }
};

/**
 * AC: no RSVP action because there is no label — the reply-by line and the header action's own label
 * both blank. No empty pill: the secondary action stands alone.
 *
 * With only the reply-by line blank there *is* still a label, the header action's own, and the button
 * reads it; `RsvpLabelFallback` covers that.
 */
export const WithoutRsvpLabel: Story = {
  args: {
    ...MOCK,
    rsvp: { ...RSVP, rsvpLabel: '', button: mockButton('', internalLink('RSVP', '/rsvp/')) }
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [secondary] = canvas.getAllByRole('link', { hidden: true });

    await expect(canvas.getAllByRole('link', { hidden: true })).toHaveLength(1);
    await expect(secondary).toHaveTextContent('The Weekend');
    // Nothing standing in for the pill either: `Link`'s inert `<span>` has no link role, so only the
    // element count can see it.
    await expect(secondary.parentElement?.children).toHaveLength(1);
  }
};

/**
 * AC: no RSVP action because there is no destination — a reference to a page that has since been
 * unpublished projects as `null`. The label alone would render as `Link`'s inert `<span>`, a pine
 * pill that looks like a button and does nothing, so the section draws nothing instead.
 */
export const WithoutRsvpLink: Story = {
  args: {
    ...MOCK,
    rsvp: { ...RSVP, button: mockButton('RSVP', mockLink({ internalLink: undefined })) }
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [secondary] = canvas.getAllByRole('link', { hidden: true });

    await expect(canvas.getAllByRole('link', { hidden: true })).toHaveLength(1);
    await expect(secondary).toHaveTextContent('The Weekend');
    // The label is not drawn at all — not as a link, and not as the inert `<span>` either.
    await expect(canvas.queryByText(rsvpLabelOf(MOCK.rsvp))).not.toBeInTheDocument();
    await expect(secondary.parentElement?.children).toHaveLength(1);
  }
};

/**
 * `rsvpLabel` left blank in Wedding Settings, which is a supported state rather than an error. The
 * button reads the header action's own label instead — the same fallback, from the same helper, as
 * the header pill's `WithoutReplyByDate` story.
 */
export const RsvpLabelFallback: Story = {
  args: { ...MOCK, rsvp: { ...RSVP, rsvpLabel: null } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const { button } = RSVP;

    await expect(canvas.getByRole('link', { name: button?.label })).toBeVisible();
    await expect(canvas.queryByText(RSVP.rsvpLabel ?? '')).not.toBeInTheDocument();
  }
};

/**
 * The intro on its own — both actions off. The actions wrapper is not rendered at all, so there is no
 * empty flex item holding a gap open beside the paragraph.
 */
export const IntroOnly: Story = {
  args: { ...MOCK, addButton: false, showRsvp: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const { row } = partsOf(canvasElement);

    await expect(canvas.queryAllByRole('link', { hidden: true })).toHaveLength(0);
    await expect(row.children).toHaveLength(1);
  }
};

/**
 * The actions on their own. They keep their place against the right edge rather than sliding to the
 * left when there is no intro for `space-between` to push against.
 */
export const ActionsOnly: Story = {
  args: { ...MOCK, content: undefined },
  decorators: [atWidth('80rem')],
  globals: DESKTOP,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const { row } = partsOf(canvasElement);
    const rsvp = canvas.getByRole('link', { name: rsvpLabelOf(MOCK.rsvp) });

    await waitFor(() => expect(getComputedStyle(row).flexDirection).toBe('row'));

    await expect(row.children).toHaveLength(1);
    await expect(rsvp.getBoundingClientRect().right).toBeCloseTo(row.getBoundingClientRect().right, 0);
  }
};

/**
 * The intro with an empty paragraph after it — what an editor leaves behind by pressing Enter at the
 * end of the text. Sanity keeps the block.
 *
 * The empty block is dropped before `TextBlock` sees it, so the real paragraph is still the last child
 * and carries no paragraph spacing below it: its last line is still the edge the actions sit on.
 * Rendered, the empty block would lift the text 16px off that edge.
 */
export const TrailingEmptyParagraph: Story = {
  args: { ...MOCK, content: [mockBlock('normal', INTRO), mockBlock('normal', '')] },
  decorators: [atWidth('80rem')],
  globals: DESKTOP,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const { row } = partsOf(canvasElement);
    const paragraph = canvas.getByText(INTRO);
    const rsvp = canvas.getByRole('link', { name: rsvpLabelOf(MOCK.rsvp) });

    await waitFor(() => expect(getComputedStyle(row).flexDirection).toBe('row'));

    await expect(row.querySelectorAll('p')).toHaveLength(1);
    await expect(rsvp.getBoundingClientRect().bottom).toBeCloseTo(lastLineBottom(paragraph), 0);
  }
};

/**
 * Nothing to show — no intro and neither action. The section renders nothing rather than an empty
 * band of padding in the page.
 */
export const Empty: Story = {
  args: { content: [mockBlock('normal', '   ')], addButton: false, showRsvp: false },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-name="ClosingCtaSection"]')).toBeNull();
  }
};

/**
 * The dark theme, set per instance through `sectionFields` — the pine surface, stone ink, and both
 * pills taking their colours from the theme's own button tokens.
 */
export const Dark: Story = {
  args: MOCK,
  globals: { theme: 'dark' },
  play: async ({ canvasElement }) => {
    const { section } = partsOf(canvasElement);

    await expect(section).toHaveAttribute('data-theme', 'dark');
  }
};
