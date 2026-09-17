import type { Meta, StoryObj } from '@storybook/nextjs-vite';

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

export const ChipSelected: Story = {
  args: { theme: 'secondary', variant: 'pill', size: 'sm', text: 'King Room' }
};

export const Chip: Story = {
  args: { theme: 'secondary', variant: 'pill', size: 'sm', outline: true, text: 'Twin Double' }
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
  ]
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
// the story rendered a span and asserted nothing while its name claimed otherwise — the same defect
// as the two SocialsShare stories deleted in this branch. See the note in the component.
export const EmailLink: Story = {
  args: { text: 'Email us', linkType: 'email', email: 'hello@example.com' }
};
