import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent } from 'storybook/test';

import Button from '.';

const FIGMA_BUTTONS = 'https://www.figma.com/design/KxvsJuCNaG4n2QVp3iD4jd/Wedding?node-id=1-977';

const meta = {
  title: 'Foundations/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: {
    design: { type: 'figma', url: FIGMA_BUTTONS }
  },
  args: {
    text: 'Click me',
    type: 'button'
  }
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/*=============================================>>>>>
= The design's component set =
===============================================>>>>>*/

/**
 * "Primary" — the filled pine pill. The default action everywhere: the hero's RSVP link, a form's
 * submit.
 */
export const Primary: Story = {
  args: { theme: 'primary', variant: 'pill', size: 'md', text: 'Primary' }
};

/**
 * "Secondary" — the drawn pill. Same box as `Primary` to the pixel, because the border is on every
 * button and only its colour changes.
 */
export const Secondary: Story = {
  args: { theme: 'secondary', variant: 'pill', size: 'md', outline: true, text: 'Secondary' }
};

/**
 * "ACCENT / UI →" — the RSVP action in the nav. Signal lime under near-black ink, 16:1, and the one
 * place the accent appears at rest. Everything else earns it on interaction.
 */
export const Accent: Story = {
  args: { theme: 'accent', variant: 'ui', size: 'sm', mono: true, arrow: 'right', text: 'RSVP' }
};

/**
 * "GHOST / UI" — the switch-player control. A neutral border at rest that fills with the accent on
 * hover; see the note in `styles.module.scss` on why the accent cannot be the border colour.
 */
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

/** "← BACK" — no box at all, ink only, accent on hover. */
export const Bare: Story = {
  args: { variant: 'bare', size: 'sm', mono: true, arrow: 'left', text: 'Back' }
};

/** "Chip · selected" — a filled ink chip, the selected state of a chip row. */
export const ChipSelected: Story = {
  args: { theme: 'secondary', variant: 'pill', size: 'sm', text: 'King Room' }
};

/** "Chip" — the same control unselected. */
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

/** The 4px UI-chrome radius the design gives its mono controls. `rounded` is 8px. */
export const VariantUi: Story = {
  args: { theme: 'primary', variant: 'ui', size: 'md', text: 'UI' }
};

export const VariantSquare: Story = {
  args: { theme: 'primary', variant: 'square', size: 'md', text: 'Square' }
};

export const VariantBare: Story = {
  args: { variant: 'bare', size: 'md', text: 'Bare' }
};

/** The in-prose link shape. Underlined, inline, and it keeps the surrounding font weight. */
export const VariantContent: Story = {
  args: { variant: 'content', text: 'A link inside a sentence' }
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

/** 12px mono-scale control, ~38px tall at the desktop anchor. The design's UI chrome. */
export const SizeSmall: Story = {
  args: { theme: 'primary', variant: 'pill', size: 'sm', text: 'Small' }
};

/** The default. 46px at 1440px and 44.8px at 375px — fluid, and never under the 44px tap target. */
export const SizeMedium: Story = {
  args: { theme: 'primary', variant: 'pill', size: 'md', text: 'Medium' }
};

/** The full-width primary action, e.g. "PRESS START" on the RSVP form. */
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

export const WithIcon: Story = {
  args: { theme: 'primary', variant: 'pill', size: 'md', icon: 'arrowRight', iconPosition: 'right', text: 'Next' }
};

/** Stretches to the column at every width. */
export const FullWidth: Story = {
  args: { theme: 'accent', variant: 'rounded', size: 'lg', fullWidth: true, arrow: 'right', text: 'Press start' }
};

/**
 * Stretches only at and below `tablet` (769px), which is what the home hero's RSVP action does.
 * Narrow the viewport to see it; at desktop width it is an ordinary inline pill.
 */
export const FullWidthMobile: Story = {
  args: { theme: 'primary', variant: 'pill', size: 'md', fullWidthMobile: true, text: 'RSVP by 01.12.26' }
};

/*=============================================>>>>>
= States =
===============================================>>>>>*/

export const Disabled: Story = {
  args: { theme: 'primary', variant: 'pill', size: 'md', disabled: true, text: 'Disabled' }
};

export const DisabledOutline: Story = {
  args: { theme: 'primary', variant: 'pill', size: 'md', outline: true, disabled: true, text: 'Disabled' }
};

/**
 * Focus is geometry, hover is colour — the two states cannot be confused for each other.
 *
 * The assertion is on the mechanism rather than on a screenshot: keyboard focus has to produce a
 * ring (a non-`none` `outline-style` with a width and an offset) while leaving the fill alone, which
 * is exactly what distinguishes it from hover. A `:focus-visible` rule dropped from the stylesheet,
 * or an `outline: none` reset creeping back in, fails here.
 */
export const FocusVisible: Story = {
  args: { theme: 'primary', variant: 'pill', size: 'md', text: 'Tab to me' },
  play: async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: 'Tab to me' });
    const restingFill = getComputedStyle(button).backgroundColor;

    // A real keyboard tab, not `.focus()` — `:focus-visible` only matches on keyboard interaction.
    await userEvent.tab();
    await expect(button).toHaveFocus();

    const focused = getComputedStyle(button);
    expect(focused.outlineStyle).not.toBe('none');
    expect(Number.parseFloat(focused.outlineWidth)).toBeGreaterThan(0);
    expect(Number.parseFloat(focused.outlineOffset)).toBeGreaterThan(0);
    // Focus must not repaint the button; that is hover's job.
    expect(focused.backgroundColor).toBe(restingFill);
  }
};
