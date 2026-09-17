import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import SocialsShare from '.';

const meta = {
  title: 'Navigation/SocialsShare',
  component: SocialsShare,
  tags: ['autodocs']
} satisfies Meta<typeof SocialsShare>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { url: 'https://example.com', text: 'Share this' }
};

// `PillVariant` and `RightAligned` used to live here, setting `variant` and `position`. Both props
// were declared on the interface and never read, so all three stories rendered identical DOM — the
// story suite turns that kind of thing from invisible into a test that asserts nothing. Removed
// along with the props.
export const WithoutCopyLink: Story = {
  args: { url: 'https://example.com', text: 'Share this', copyLink: false }
};
