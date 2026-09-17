import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import Heading from '.';

const meta = {
  title: 'Content/Heading',
  component: Heading,
  tags: ['autodocs']
} satisfies Meta<typeof Heading>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Section: Story = {
  args: { tagline: 'Tagline', title: 'Section heading', subtitle: 'Subtitle goes here', variant: 'section' }
};

export const Hero: Story = {
  args: { tagline: 'Welcome', title: 'Hero heading', subtitle: 'Larger subtitle text', variant: 'hero' }
};

export const Body: Story = {
  args: { title: 'Body heading', subtitle: 'Smaller subtitle text', variant: 'body' }
};

export const SecondaryTheme: Story = {
  args: { tagline: 'Tagline', title: 'Themed heading', theme: 'secondary' }
};
