import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import Accordion from '.';

const meta = {
  title: 'Surfaces/Accordion',
  component: Accordion,
  tags: ['autodocs']
} satisfies Meta<typeof Accordion>;

export default meta;

type Story = StoryObj<typeof meta>;

const items = (
  <>
    <Accordion.Item title="What is this?">
      <p>This is the first item's expanded content.</p>
    </Accordion.Item>
    <Accordion.Item title="How does it work?">
      <p>This is the second item's expanded content.</p>
    </Accordion.Item>
    <Accordion.Item title="Can I customise it?">
      <p>This is the third item's expanded content.</p>
    </Accordion.Item>
  </>
);

export const Default: Story = { args: { children: items } };

export const FirstOpen: Story = { args: { activeIndex: 0, children: items } };

export const LimitTwo: Story = {
  args: { showAll: false, showLimit: 2, children: items }
};
