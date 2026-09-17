import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import TextTitle from '.';

const meta = {
  title: 'Content/TextTitle',
  component: TextTitle,
  tags: ['autodocs']
} satisfies Meta<typeof TextTitle>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { title: '<h2>Section heading with <span>highlight</span></h2>', variant: 'heading', size: 'lg' }
};

export const PlainTitle: Story = {
  args: { title: 'Plain title without tags', variant: 'heading', size: 'md' }
};

export const Centered: Story = {
  args: { title: '<h2>Centered heading</h2>', variant: 'heading', size: 'xl', alignment: 'center' }
};
