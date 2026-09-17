import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import Socials from '.';

const meta = {
  title: 'Navigation/Socials',
  component: Socials,
  tags: ['autodocs'],
  parameters: { layout: 'centered' }
} satisfies Meta<typeof Socials>;

export default meta;

type Story = StoryObj<typeof meta>;

const socials = [
  { name: 'facebook' as const, link: 'https://facebook.com', _key: '1' },
  { name: 'instagram' as const, link: 'https://instagram.com', _key: '2' },
  { name: 'linkedin' as const, link: 'https://linkedin.com', _key: '3' },
  { name: 'twitter' as const, link: 'https://twitter.com', _key: '4' }
];

export const Default: Story = { args: { socials, size: 'md' } };
export const Small: Story = { args: { socials, size: 'sm' } };
export const Large: Story = { args: { socials, size: 'lg' } };
