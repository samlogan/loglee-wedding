import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import type { IClosingCtaSection } from '@/tools/sanity/schema/sections/closingCtaSection';
import mockBlockContent from '@/tools/storybook/mockBlockContent';
import mockButton from '@/tools/storybook/mockButton';
import sectionFixture from '@/tools/storybook/sectionFixture';

import ClosingCtaSection from '.';

const meta = {
  title: 'Sections/Closing CTA',
  component: ClosingCtaSection,
  tags: ['autodocs']
} satisfies Meta<typeof ClosingCtaSection>;

export default meta;

type Story = StoryObj<typeof meta>;

// Real section data from the Sanity dataset (yarn storybook:fixtures), with a
// mock fallback for when the section has no published instance yet.
const data = sectionFixture<IClosingCtaSection>('closingCtaSection') ?? {
  title: 'Ready to get started?',
  content: mockBlockContent('sm'),
  addButton: true,
  button: mockButton('Contact us')
};

export const Default: Story = {
  args: data
};

export const WithoutButton: Story = {
  args: { ...data, addButton: false }
};
