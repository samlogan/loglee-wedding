import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import Video from '.';

const meta = {
  title: 'Foundations/Video',
  component: Video,
  tags: ['autodocs']
} satisfies Meta<typeof Video>;

export default meta;

type Story = StoryObj<typeof meta>;

export const YouTube: Story = {
  args: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', controls: true }
};

export const Vimeo: Story = {
  args: { url: 'https://vimeo.com/76979871', controls: true }
};

/** Fills its parent instead of drawing a 16:9 box, letterboxing on black. */
export const Fill: Story = {
  args: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', fill: true },
  decorators: [
    (Story) => (
      <div style={{ height: '480px', width: '100%' }}>
        <Story />
      </div>
    )
  ]
};

/** Autoplaying, muted and looping, with the controls kept so it can be paused. */
export const Ambient: Story = {
  args: { url: 'https://vimeo.com/76979871', ambient: true }
};
