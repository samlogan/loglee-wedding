import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import type { ILogosSection } from '@/tools/sanity/schema/sections/logosSection';
import mockImage from '@/tools/storybook/mockImage';
import sectionFixture from '@/tools/storybook/sectionFixture';

import LogosSection from '.';

const meta = {
  title: 'Sections/Logos',
  component: LogosSection,
  tags: ['autodocs']
} satisfies Meta<typeof LogosSection>;

export default meta;

type Story = StoryObj<typeof meta>;

// Real section data from the Sanity dataset (yarn storybook:fixtures), with a
// mock fallback for when the section has no published instance yet.
const data = sectionFixture<ILogosSection>('logosSection');

export const Default: Story = {
  args: data ?? {
    useGlobalComponent: false,
    title: 'Trusted by leading brands',
    images: [1, 2, 3, 4, 5, 6].map((index) => mockImage({ seed: `logo-${index}`, width: 200, height: 80 }))
  }
};
