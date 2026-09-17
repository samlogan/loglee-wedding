import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import type { IThreeColBlogSection } from '@/tools/sanity/schema/sections/threeColBlogSection';
import mockBlockContent from '@/tools/storybook/mockBlockContent';
import mockButton from '@/tools/storybook/mockButton';
import mockImage from '@/tools/storybook/mockImage';
import sectionFixture from '@/tools/storybook/sectionFixture';

import ThreeColBlogSection from '.';

const meta = {
  title: 'Sections/Three Column Blog',
  component: ThreeColBlogSection,
  tags: ['autodocs']
} satisfies Meta<typeof ThreeColBlogSection>;

export default meta;

type Story = StoryObj<typeof meta>;

const mockCard = (index: number) => ({
  _key: `blog-card-${index}`,
  title: `<span>Article ${index}</span>`,
  content: mockBlockContent('sm'),
  // Lead images for article cards, so photography at the 16:9 the component renders.
  image: mockImage({ seed: `blog-card-${index}`, width: 800, height: 450, aspectRatio: '16-9' }),
  addButton: true,
  button: mockButton('Read more')
});

const data = sectionFixture<IThreeColBlogSection>('threeColBlogSection') ?? {
  title: 'Latest thinking',
  content: mockBlockContent('md'),
  addButton: true,
  button: mockButton('View all'),
  featureCards: [1, 2, 3].map(mockCard)
};

export const Default: Story = { args: data };

export const WithoutButton: Story = { args: { ...data, addButton: false } };

export const TwoRows: Story = {
  args: {
    ...data,
    /*
     * The second row is re-keyed rather than appended as-is. Duplicating the array verbatim gives two
     * children the same `_key`, and React reconciles duplicate keys unpredictably — it can carry state
     * from the first row onto the second, which is a confusing thing to hit in a story whose whole
     * purpose is to show a second row laying out cleanly.
     */
    featureCards: [
      ...(data.featureCards ?? []),
      ...(data.featureCards ?? []).map((card, index) => ({ ...card, _key: `${card._key}-row2-${index}` }))
    ]
  }
};
