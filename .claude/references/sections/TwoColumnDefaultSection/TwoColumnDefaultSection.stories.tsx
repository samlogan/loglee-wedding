import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import type { ITwoColumnDefaultSection } from '@/tools/sanity/schema/sections/twoColDefaultSection';
import mockBlockContent from '@/tools/storybook/mockBlockContent';
import mockButton from '@/tools/storybook/mockButton';
import mockImage from '@/tools/storybook/mockImage';
import sectionFixture from '@/tools/storybook/sectionFixture';

import TwoColumnDefaultSection from '.';

const meta = {
  title: 'Sections/Two Column Default',
  component: TwoColumnDefaultSection,
  tags: ['autodocs']
} satisfies Meta<typeof TwoColumnDefaultSection>;

export default meta;

type Story = StoryObj<typeof meta>;

// Real section data from the Sanity dataset (yarn storybook:fixtures), with a
// mock fallback for when the section has no published instance yet.
const data = sectionFixture<ITwoColumnDefaultSection>('twoColDefaultSection') ?? {
  tagline: 'About',
  title: '<h2>Tell your story</h2>',
  content: mockBlockContent('md'),
  addButton: true,
  button: mockButton('Read more'),
  image: mockImage({ seed: 'two-col', width: 1200, height: 900, aspectRatio: '4-3' }),
  alignMedia: 'left',
  theme: 'light'
};

export const MediaLeft: Story = {
  args: { ...data, alignMedia: 'left' }
};

export const MediaRight: Story = {
  args: { ...data, alignMedia: 'right' }
};
