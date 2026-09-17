import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import mockBlockContent from '@/tools/storybook/mockBlockContent';

import TextBlock from '.';

const meta = {
  title: 'Content/TextBlock',
  component: TextBlock,
  tags: ['autodocs']
} satisfies Meta<typeof TextBlock>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Short: Story = {
  args: { blocks: mockBlockContent('sm') }
};

export const Medium: Story = {
  args: { blocks: mockBlockContent('md') }
};

export const Long: Story = {
  args: { blocks: mockBlockContent('lg') }
};

export const CenteredLong: Story = {
  args: { blocks: mockBlockContent('lg'), alignment: 'center' }
};

export const ReadMore: Story = {
  args: { blocks: mockBlockContent('lg'), readMore: true, wordCount: 30 }
};
