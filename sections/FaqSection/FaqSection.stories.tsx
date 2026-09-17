import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import type { IFaqSection } from '@/tools/sanity/schema/sections/faqSection';
import mockBlockContent from '@/tools/storybook/mockBlockContent';
import mockButton from '@/tools/storybook/mockButton';
import sectionFixture from '@/tools/storybook/sectionFixture';

import FaqSection from '.';

const meta = {
  title: 'Sections/FAQ',
  component: FaqSection,
  tags: ['autodocs']
} satisfies Meta<typeof FaqSection>;

export default meta;

type Story = StoryObj<typeof meta>;

// Real section data from the Sanity dataset (yarn storybook:fixtures), with a
// mock fallback for when the section has no published instance yet.
const data = sectionFixture<IFaqSection>('faqSection') ?? {
  tagline: 'Help',
  title: '<h2>Frequently asked questions</h2>',
  content: mockBlockContent('sm'),
  addButton: true,
  button: mockButton('Contact support'),
  faqItems: [
    { question: 'What payment methods do you accept?', answer: mockBlockContent('sm') },
    { question: 'How long does shipping take?', answer: mockBlockContent('sm') },
    { question: 'Can I return an item?', answer: mockBlockContent('sm') }
  ]
};

export const Default: Story = {
  args: data
};

export const WithoutHeader: Story = {
  args: { ...data, tagline: undefined, title: undefined, addButton: false }
};
