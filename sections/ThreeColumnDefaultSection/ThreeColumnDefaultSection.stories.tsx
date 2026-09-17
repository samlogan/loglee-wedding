import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import type { IThreeColSection } from '@/tools/sanity/schema/sections/threeColSection';
import mockBlockContent from '@/tools/storybook/mockBlockContent';
import mockButton from '@/tools/storybook/mockButton';
import mockImage from '@/tools/storybook/mockImage';
import sectionFixture from '@/tools/storybook/sectionFixture';

import ThreeColSection from '.';

const meta = {
  title: 'Sections/Three Column Simple',
  component: ThreeColSection,
  tags: ['autodocs']
} satisfies Meta<typeof ThreeColSection>;

export default meta;

type Story = StoryObj<typeof meta>;

const mockCard = (index: number) => ({
  _key: `three-col-${index}`,
  title: `<span>Feature ${index}</span>`,
  content: mockBlockContent('sm'),
  // `kind: 'logo'` — these are small supporting marks, not photography. The default photo pool would
  // put a picture of a person where an icon belongs.
  image: mockImage({ seed: `three-col-${index}`, width: 128, height: 128, aspectRatio: '1-1', kind: 'logo' }),
  addButton: false,
  button: mockButton('Learn more')
});

// Real section data from the Sanity dataset (yarn storybook:fixtures), with a mock fallback for when
// the section has no published instance yet.
const data = sectionFixture<IThreeColSection>('threeColSection') ?? {
  tagline: 'How it works',
  title: '<h2>Three steps, start to finish</h2>',
  content: mockBlockContent('md'),
  featureCards: [1, 2, 3].map(mockCard)
};

export const Default: Story = { args: data };

// The grid is three-up, so six cards is the check that a second row lands cleanly.
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

// Cards are optional in the schema; GROQ projects an empty array as `null`, so this is the shape the
// component has to survive rather than a hypothetical one.
export const WithoutCards: Story = {
  args: { ...data, featureCards: null as unknown as IThreeColSection['featureCards'] }
};
