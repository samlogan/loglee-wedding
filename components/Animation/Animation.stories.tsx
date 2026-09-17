import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import Animation from '.';

const meta = {
  title: 'Foundations/Animation',
  component: Animation,
  tags: ['autodocs']
} satisfies Meta<typeof Animation>;

export default meta;

type Story = StoryObj<typeof meta>;

const child = (
  <div style={{ padding: '32px', background: 'var(--bg-accent)', borderRadius: '8px' }}>Animated content</div>
);

export const SlideUp: Story = { args: { animation: 'slideUp', children: child } };
export const SlideDown: Story = { args: { animation: 'slideDown', children: child } };
export const SlideLeft: Story = { args: { animation: 'slideLeft', children: child } };
export const SlideRight: Story = { args: { animation: 'slideRight', children: child } };
export const Fade: Story = { args: { animation: 'fade', children: child } };
