import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import type { IGridSection } from '@/tools/sanity/schema/sections/gridSection';
import mockBlockContent from '@/tools/storybook/mockBlockContent';
import mockButton from '@/tools/storybook/mockButton';
import mockImage from '@/tools/storybook/mockImage';
import sectionFixture from '@/tools/storybook/sectionFixture';

import GridSection from '.';

const meta = {
  title: 'Sections/Grid',
  component: GridSection,
  tags: ['autodocs']
} satisfies Meta<typeof GridSection>;

export default meta;

type Story = StoryObj<typeof meta>;

const mockCard = (index: number) => ({
  title: `Feature ${index}`,
  content: mockBlockContent('sm'),
  image: mockImage({ seed: `card-${index}`, width: 600, height: 600, aspectRatio: '1-1' }),
  addButton: true,
  button: mockButton('Learn more')
});

// Real section data from the Sanity dataset (yarn storybook:fixtures), with a
// mock fallback for when the section has no published instance yet.
const data = sectionFixture<IGridSection>('gridSection') ?? {
  tagline: 'Why us',
  title: '<h2>Built for teams</h2>',
  content: mockBlockContent('md'),
  cards: [1, 2, 3].map(mockCard)
};

export const Default: Story = {
  args: data
};

// Controlled variant: duplicate the cards to exercise a denser grid.
export const ManyCards: Story = {
  args: { ...data, cards: [...(data.cards ?? []), ...(data.cards ?? [])] }
};
