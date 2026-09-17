import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import mockImage from '@/tools/storybook/mockImage';

import Card from '.';

const meta = {
  title: 'Surfaces/Card',
  component: Card,
  tags: ['autodocs']
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

const cardContent = (
  <>
    <Card.Image
      image={mockImage({ seed: 'card-1', width: 600, height: 400, aspectRatio: '16-9' })}
      title="Card title"
    />
    <Card.Content title="Card title" subtitle="Card subtitle">
      <p>Some descriptive content for the card.</p>
    </Card.Content>
  </>
);

export const Default: Story = { args: { children: cardContent } };
export const OutlineVariant: Story = { args: { variant: 'outline', children: cardContent } };

// `outline` is the component's own default, so `Default` above already renders it — this is the
// distinct state: `default` has no `.variant_default` rule, so the card renders as the bare base
// with no border.
export const DefaultVariant: Story = { args: { variant: 'default', children: cardContent } };
// `ariaLabel` is not optional in practice when `href` is set: the overlay link has no text, so
// without it the card is an unlabelled link. Named after the card's heading, as a real caller would.
export const Linked: Story = {
  args: { href: '/sample-page', ariaLabel: 'Card heading', children: cardContent }
};
