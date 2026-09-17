import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import type { IMediaSection } from '@/tools/sanity/schema/sections/mediaSection';
import mockImage from '@/tools/storybook/mockImage';
import sectionFixture from '@/tools/storybook/sectionFixture';

import MediaSection from '.';

const meta = {
  title: 'Sections/Media',
  component: MediaSection,
  tags: ['autodocs']
} satisfies Meta<typeof MediaSection>;

export default meta;

type Story = StoryObj<typeof meta>;

// Real section data from the Sanity dataset (yarn storybook:fixtures), with a
// mock fallback for when the section has no published instance yet.
const data = sectionFixture<IMediaSection>('mediaSection') ?? {
  mediaType: 'image',
  image: mockImage({ seed: 'media', width: 1600, height: 900, aspectRatio: '16-9' }),
  videoUrl: '',
  thumbnail: mockImage({ seed: 'media-thumb', width: 1600, height: 900, aspectRatio: '16-9' })
};

export const Default: Story = {
  args: data
};

export const Video: Story = {
  args: { ...data, mediaType: 'video', videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }
};
