import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import type { IHeaderSimpleSection } from '@/tools/sanity/schema/sections/headerSimpleSection';
import mockBlockContent from '@/tools/storybook/mockBlockContent';
import sectionFixture from '@/tools/storybook/sectionFixture';

import HeaderSimpleSection from '.';

const meta = {
  title: 'Sections/Header Simple',
  component: HeaderSimpleSection,
  tags: ['autodocs']
} satisfies Meta<typeof HeaderSimpleSection>;

export default meta;

type Story = StoryObj<typeof meta>;

// Real section data from the Sanity dataset (yarn storybook:fixtures), with a
// mock fallback for when the section has no published instance yet.
const data = sectionFixture<IHeaderSimpleSection>('headerSimpleSection') ?? {
  tagline: 'Section label',
  title: 'Simple header',
  content: mockBlockContent('sm')
};

export const Default: Story = {
  args: data
};
