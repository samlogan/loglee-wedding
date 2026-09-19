import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import Link from '.';

const FIGMA_BUTTONS = 'https://www.figma.com/design/KxvsJuCNaG4n2QVp3iD4jd/Wedding?node-id=1-977';

/*
 * `Link` shares `Button`'s stylesheet and appearance props, so the variant/size/theme matrix below
 * mirrors `Button.stories.tsx` deliberately rather than by accident. It is not duplication for its
 * own sake: an anchor and a button resolve `:hover`, `:focus-visible` and `:disabled` differently,
 * and every one of these stories is a browser component test — so the matrix has to be exercised on
 * both elements to be worth anything. The stories unique to this component (destination types,
 * `content`) have no `Button` counterpart.
 */
const meta = {
  title: 'Foundations/Link',
  component: Link,
  tags: ['autodocs'],
  parameters: {
    design: { type: 'figma', url: FIGMA_BUTTONS }
  },
  args: {
    text: 'Click me',
    href: '/sample'
  }
} satisfies Meta<typeof Link>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/*=============================================>>>>>
= The design's component set =
===============================================>>>>>*/

/** "Primary" — the hero's "RSVP by 01.12.26". */
export const Primary: Story = {
  args: { theme: 'primary', variant: 'pill', size: 'md', text: 'RSVP by 01.12.26' }
};

/** "Secondary" — the hero's "The Weekend". */
export const Secondary: Story = {
  args: { theme: 'secondary', variant: 'pill', size: 'md', outline: true, text: 'The Weekend' }
};

/** "ACCENT / UI →" — the nav's RSVP pill, the one place the accent sits at rest. */
export const Accent: Story = {
  args: { theme: 'accent', variant: 'ui', size: 'sm', mono: true, arrow: 'right', text: 'RSVP' }
};

/** "GHOST / UI" — the player page's "SWITCH PLAYER → LAUREN". */
export const Ghost: Story = {
  args: {
    theme: 'accent',
    variant: 'ui',
    size: 'sm',
    outline: true,
    mono: true,
    arrow: 'right',
    text: 'Switch player'
  }
};

/** "← BACK" — the player page's back control. */
export const Bare: Story = {
  args: { variant: 'bare', size: 'sm', mono: true, arrow: 'left', text: 'Back' }
};

/**
 * "Chip · selected" — a filled ink chip, the selected state of a chip row.
 *
 * `md`, not `sm`: the design sets a chip in 15px body type on a 44px box (the RSVP form's room
 * preference row, node 1:833), which is the `md` step. `sm` is the 12px mono UI register and would
 * render this a fifth smaller.
 */
export const ChipSelected: Story = {
  args: { theme: 'secondary', variant: 'pill', size: 'md', text: 'King Room' }
};

/** "Chip" — the same control unselected. */
export const Chip: Story = {
  args: { theme: 'secondary', variant: 'pill', size: 'md', outline: true, text: 'Twin Double' }
};

/*=============================================>>>>>
= Variants =
===============================================>>>>>*/

export const VariantPill: Story = {
  args: { theme: 'primary', variant: 'pill', size: 'md', text: 'Pill' }
};

export const VariantRounded: Story = {
  args: { theme: 'primary', variant: 'rounded', size: 'md', text: 'Rounded' }
};

export const VariantUi: Story = {
  args: { theme: 'primary', variant: 'ui', size: 'md', text: 'UI' }
};

export const VariantSquare: Story = {
  args: { theme: 'primary', variant: 'square', size: 'md', text: 'Square' }
};

export const VariantBare: Story = {
  args: { variant: 'bare', size: 'md', text: 'Bare' }
};

/**
 * The variant for links inside rich text — this is what `TextBlock` passes for a link mark.
 *
 * `display: inline` is the load-bearing part: the shared button base is `inline-flex`, which turns a
 * link into a single unbreakable box that will not wrap mid-paragraph.
 */
export const VariantContent: Story = {
  args: { variant: 'content', text: 'a link inside a paragraph' },
  decorators: [
    (Story) => (
      <p style={{ maxWidth: 260 }}>
        Three days among the pines by the Minnamurra River, and here is {<Story />} that has to wrap across the measure
        like any other run of text.
      </p>
    )
  ],
  /*
   * Asserted on the behaviour rather than on `display`, because the behaviour is the point and the
   * property is only how it is currently bought: an element that wraps mid-paragraph occupies more
   * than one client rect. Reverting `.variant_content` to the `inline-flex` base fails here, which
   * nothing caught before — the story rendered identically either way, just one line wider.
   *
   * Note this guards `Link` specifically. `Button` cannot pass it: CSS blockifies `<button>`, so
   * `display: inline` computes to `inline-block` there and an in-prose `<Button variant="content">`
   * still refuses to wrap. See the note in `Button/styles.module.scss`.
   */
  play: async ({ canvas }) => {
    const link = canvas.getByRole('link', { name: 'a link inside a paragraph' });
    await expect(link.getClientRects().length).toBeGreaterThan(1);
  }
};

/*=============================================>>>>>
= Themes =
===============================================>>>>>*/

export const ThemePrimary: Story = {
  args: { theme: 'primary', variant: 'pill', size: 'md', text: 'Primary' }
};

export const ThemeSecondary: Story = {
  args: { theme: 'secondary', variant: 'pill', size: 'md', text: 'Secondary' }
};

export const ThemeAccent: Story = {
  args: { theme: 'accent', variant: 'pill', size: 'md', text: 'Accent' }
};

/*=============================================>>>>>
= Outline =
===============================================>>>>>*/

export const OutlinePrimary: Story = {
  args: { theme: 'primary', variant: 'pill', size: 'md', outline: true, text: 'Primary outline' }
};

export const OutlineSecondary: Story = {
  args: { theme: 'secondary', variant: 'pill', size: 'md', outline: true, text: 'Secondary outline' }
};

export const OutlineAccent: Story = {
  args: { theme: 'accent', variant: 'pill', size: 'md', outline: true, text: 'Accent outline' }
};

/*=============================================>>>>>
= Sizes =
===============================================>>>>>*/

export const SizeSmall: Story = {
  args: { theme: 'primary', variant: 'pill', size: 'sm', text: 'Small' }
};

export const SizeMedium: Story = {
  args: { theme: 'primary', variant: 'pill', size: 'md', text: 'Medium' }
};

export const SizeLarge: Story = {
  args: { theme: 'primary', variant: 'pill', size: 'lg', text: 'Large' }
};

/*=============================================>>>>>
= Modifiers =
===============================================>>>>>*/

export const MonoLabel: Story = {
  args: { theme: 'primary', variant: 'ui', size: 'sm', mono: true, text: 'Select player' }
};

export const ArrowRight: Story = {
  args: { theme: 'primary', variant: 'pill', size: 'md', arrow: 'right', text: 'Continue' }
};

export const ArrowLeft: Story = {
  args: { theme: 'secondary', variant: 'pill', size: 'md', outline: true, arrow: 'left', text: 'Back' }
};

export const FullWidth: Story = {
  args: { theme: 'accent', variant: 'rounded', size: 'lg', fullWidth: true, arrow: 'right', text: 'Press start' }
};

/** Stretches at and below `tablet` only — the home hero's RSVP action on a phone. */
export const FullWidthMobile: Story = {
  args: { theme: 'primary', variant: 'pill', size: 'md', fullWidthMobile: true, text: 'RSVP by 01.12.26' }
};

/*=============================================>>>>>
= Destinations =
===============================================>>>>>*/

export const ExternalLink: Story = {
  args: { linkType: 'external', externalLink: 'https://example.com', text: 'Visit example.com' }
};

export const PhoneLink: Story = {
  args: { linkType: 'phone', phone: '+61400000000', text: 'Call us' }
};

// `email` carries the guard that stops an empty address rendering `mailto:undefined`.
//
// There is deliberately no `ActionLink` story to match. One was added here and removed on review:
// `linkType: 'action'` takes no branch in the component and falls through to the plain `<span>`, so
// the story rendered a span and asserted nothing while its name claimed otherwise. A story named
// for a behaviour the component does not have is worse than no story — it reads as coverage. See
// the note on the fallback branch in the component.
export const EmailLink: Story = {
  args: { text: 'Email us', linkType: 'email', email: 'hello@example.com' }
};

/**
 * No destination — an editor picked a link type in the Studio and left the field blank, which this
 * dataset contains.
 *
 * The label still shows, but nothing pretends to be actionable: it renders a `<span>`, so no role
 * and no tab stop, and it carries the `inert` modifier so it does not keep the pointer cursor, the
 * hover swap or (under `variant="content"`) the underline. That last part is the point — before the
 * modifier existed a blank rich-text link rendered as underlined, link-coloured prose that did
 * nothing, so a sighted user saw a link exactly where a screen reader correctly announced none.
 */
export const NoDestination: Story = {
  args: { text: 'Email us', linkType: 'email', email: '', href: '', variant: 'content' },
  play: async ({ canvas }) => {
    // Not a link, to anyone: `queryByRole` is the assertion, not a class check.
    await expect(canvas.queryByRole('link')).toBeNull();

    const span = canvas.getByText('Email us');
    await expect(span.tagName).toBe('SPAN');

    // And not dressed as one. `pointer-events: none` is what takes the cursor and the hover with it.
    const styles = getComputedStyle(span);
    await expect(styles.pointerEvents).toBe('none');
    await expect(styles.textDecorationLine).toBe('none');
  }
};

/**
 * An off-site link opens in a new tab, and says so to a screen reader: "(opens in a new tab)" joins
 * its accessible name without showing on screen.
 */
export const External: Story = {
  args: { externalLink: 'https://thelodgejamberoo.com.au/', linkType: 'external', text: 'The Lodge' },
  play: async ({ canvasElement }) => {
    const link = within(canvasElement).getByRole('link');

    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link.getAttribute('rel')).toContain('noreferrer');
    await expect(link).toHaveAccessibleName('The Lodge (opens in a new tab)');
    await expect(link).toHaveTextContent(/^The Lodge/);
  }
};

/** Content rather than `text`: the note is hidden text inside the link instead. */
export const ExternalWithChildren: Story = {
  args: { children: 'Open in maps', externalLink: 'https://maps.google.com/', linkType: 'external', text: undefined },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('link')).toHaveAccessibleName('Open in maps (opens in a new tab)');
  }
};

/** A caller that asks for the same tab gets it, and no note. */
export const ExternalSameTab: Story = {
  args: { externalLink: 'https://thelodgejamberoo.com.au/', linkType: 'external', target: '_self', text: 'The Lodge' },
  play: async ({ canvasElement }) => {
    const link = within(canvasElement).getByRole('link');

    await expect(link).toHaveAttribute('target', '_self');
    await expect(link).toHaveAccessibleName('The Lodge');
  }
};

/** Internal links stay in the same tab. */
export const Internal: Story = {
  args: { href: '/stay/', text: 'Stay' },
  play: async ({ canvasElement }) => {
    const link = within(canvasElement).getByRole('link');

    await expect(link).not.toHaveAttribute('target', '_blank');
    await expect(link).toHaveAccessibleName('Stay');
  }
};
