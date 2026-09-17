import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import mockImage, { mockImageUrl } from '@/tools/storybook/mockImage';

import Image from '.';

const meta = {
  title: 'Foundations/Image',
  component: Image,
  tags: ['autodocs'],
  parameters: { layout: 'centered' }
} satisfies Meta<typeof Image>;

export default meta;

type Story = StoryObj<typeof meta>;

export const StandardSrc: Story = {
  args: {
    /*
     * A real URL from the connected dataset, resolved at render time rather than hardcoded.
     *
     * This story exercises the `src` variant, which takes a plain URL rather than a Sanity asset.
     * `mockImageUrl` picks one out of the same fixture pool `mockImage` draws from, so it is correct
     * in this boilerplate and in every project built from it. A literal `cdn.sanity.io` URL would
     * 404 everywhere but the one dataset it came from, and an external host puts a third-party
     * request in a client-facing Storybook. With no fixtures yet it falls back to the local
     * placeholder.
     */
    src: mockImageUrl({ seed: 'standard' }),
    alt: 'Standard image',
    width: 800,
    height: 600
  }
};

export const SanityAsset: Story = {
  args: mockImage({ seed: 'sanity-asset', width: 1200, height: 800, aspectRatio: '16-9' })
};

export const SquareAspect: Story = {
  args: mockImage({ seed: 'square', width: 800, height: 800, aspectRatio: '1-1' })
};
