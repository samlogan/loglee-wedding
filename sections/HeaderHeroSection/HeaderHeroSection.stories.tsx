import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import type { IHeaderHeroSection } from '@/tools/sanity/schema/sections/headerHeroSection';
import mockBlockContent from '@/tools/storybook/mockBlockContent';
import mockButton from '@/tools/storybook/mockButton';
import mockImage from '@/tools/storybook/mockImage';
import sectionFixture from '@/tools/storybook/sectionFixture';

import HeaderHeroSection from '.';

const meta = {
  title: 'Sections/Header Hero',
  component: HeaderHeroSection,
  tags: ['autodocs']
} satisfies Meta<typeof HeaderHeroSection>;

export default meta;

type Story = StoryObj<typeof meta>;

// Real section data from the Sanity dataset (yarn storybook:fixtures), with a
// mock fallback for when the section has no published instance yet.
const data = sectionFixture<IHeaderHeroSection>('headerHeroSection') ?? {
  tagline: 'Welcome',
  title: 'Build something great',
  content: mockBlockContent('md'),
  addButton: true,
  button: mockButton('Get started'),
  image: mockImage({ seed: 'hero', width: 1600, height: 900, aspectRatio: '16-9' })
};

export const Default: Story = {
  args: data
};

export const WithoutButton: Story = {
  args: { ...data, addButton: false }
};
