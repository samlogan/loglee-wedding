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
