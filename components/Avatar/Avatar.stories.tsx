import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import mockImage from '@/tools/storybook/mockImage';

import Avatar from '.';

const meta = {
  title: 'Foundations/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  parameters: { layout: 'centered' }
} satisfies Meta<typeof Avatar>;

export default meta;

type Story = StoryObj<typeof meta>;

const image = mockImage({ seed: 'avatar', width: 200, height: 200, aspectRatio: '1-1' });

export const Default: Story = { args: { name: 'Sam Logan', image } };
export const Small: Story = { args: { name: 'Sam Logan', image, size: 'sm' } };
export const Large: Story = { args: { name: 'Sam Logan', image, size: 'lg' } };
export const InitialsOnly: Story = { args: { name: 'Sam Logan', showImage: false } };
