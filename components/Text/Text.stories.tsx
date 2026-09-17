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

export const Uppercase: Story = {
  args: { textTransform: 'uppercase', size: 'sm', weight: 'medium' }
};

export const CenteredBold: Story = {
  args: { alignment: 'center', weight: 'bold', size: 'lg' }
};
