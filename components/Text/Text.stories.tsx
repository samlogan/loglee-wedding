import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import Text from '.';

const meta = {
  title: 'Content/Text',
  component: Text,
  tags: ['autodocs'],
  args: {
    text: 'The quick brown fox jumps over the lazy dog.'
  }
} satisfies Meta<typeof Text>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * The oversized tier, above the heading scale. `lg` is what the home hero is set at — 176px at the
 * 1440px design frame, scaling down to 64px on a phone. Only `md` and `lg` exist; the smaller steps
 * of `ProjectFontSize` belong to `heading` and `body`.
 */
export const Display: Story = {
  args: { as: 'h1', variant: 'display', size: 'lg', text: 'Sam & Lauren' }
};

export const DisplayMedium: Story = {
  args: { as: 'h2', variant: 'display', size: 'md', text: 'Sam & Lauren' }
};

export const Heading: Story = {
  args: { as: 'h2', variant: 'heading', size: 'lg' }
};

export const Body: Story = {
  args: { as: 'p', variant: 'body', size: 'md' }
};

/**
 * The third type role — JetBrains Mono. Stats, times, tags, eyebrows, opening hours, chips.
 *
 * Three rungs only (`2xs`, `xs`, `sm`), and `2xs` is reachable **only** here: it is the step below
 * `--body-xs`, the floor of the body scale, and `TextProps` fences it to this variant so
 * `<Text variant="body" size="2xs">` cannot type-check against a rule that does not exist.
 *
 * The default is the quiet register — Medium at `--mono-letter-spacing` (0.1em).
 */
export const Mono: Story = {
  args: { variant: 'mono', size: 'sm', text: 'Doors 18:00' }
};

export const MonoXs: Story = {
  args: { variant: 'mono', size: 'xs', text: 'Doors 18:00' }
};

/**
 * The micro-label rung, below the body scale's floor. The size a capacity label, a footnote, a
 * location pill or a two-digit index is drawn at.
 */
export const Mono2xs: Story = {
  args: { variant: 'mono', size: '2xs', text: 'Doors 18:00' }
};

/**
 * Casing is the caller's, not the variant's — `.variant_mono` declares no `text-transform`, because
 * CMS copy is authored in sentence case and `ModelViewer`'s file-name chip has to print its value
 * verbatim. This is how every uppercase mono label in the repo asks for it.
 */
export const MonoUppercase: Story = {
  args: { variant: 'mono', size: '2xs', textTransform: 'uppercase', text: 'Barn · 60 seated' }
};

/**
 * The loud register. `weight="bold"` selects it, and the tracking follows the weight —
 * `--mono-letter-spacing-loud` (0.2em) rather than the quiet 0.1em. There is no separate `register`
 * prop; the design draws these two and only these two.
 */
export const MonoLoud: Story = {
  args: { variant: 'mono', size: 'xs', weight: 'bold', textTransform: 'uppercase', text: 'The weekend' }
};

/** The quiet register stated explicitly — the same tracking the variant defaults to. */
export const MonoQuiet: Story = {
  args: { variant: 'mono', size: 'xs', weight: 'medium', textTransform: 'uppercase', text: 'The weekend' }
};

export const Uppercase: Story = {
  args: { textTransform: 'uppercase', size: 'sm', weight: 'medium' }
};

/**
 * `legend`, `dt` and `dd` joined the `as` union with the mono variant — `FieldCheckbox`'s group
 * label is a `<legend>` and `PlayerCard`'s stats are a description list, and before this those three
 * elements were why those call sites could not route through `Text` at all.
 */
export const AsDescriptionTerm: Story = {
  args: { as: 'dt', variant: 'mono', size: '2xs', textTransform: 'uppercase', text: 'How we met' }
};

/** Decoration rather than content — a visible ordinal the list around it already conveys. */
export const AriaHidden: Story = {
  args: { ariaHidden: true, variant: 'mono', size: 'xs', text: '01' }
};

export const CenteredBold: Story = {
  args: { alignment: 'center', weight: 'bold', size: 'lg' }
};
