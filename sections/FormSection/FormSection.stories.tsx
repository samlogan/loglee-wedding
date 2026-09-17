import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import FormSection from '.';

const meta = {
  title: 'Sections/Form',
  component: FormSection,
  tags: ['autodocs']
} satisfies Meta<typeof FormSection>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Get in touch'
  }
};
