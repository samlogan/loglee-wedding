import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import Breadcrumbs from '.';

const meta = {
  title: 'Navigation/Breadcrumbs',
  component: Breadcrumbs,
  tags: ['autodocs']
} satisfies Meta<typeof Breadcrumbs>;

export default meta;

type Story = StoryObj<typeof meta>;

const trail = (
  <>
    <Breadcrumbs.Item href="/">Home</Breadcrumbs.Item>
    <Breadcrumbs.Item href="/products">Products</Breadcrumbs.Item>
    <Breadcrumbs.Item>Detail</Breadcrumbs.Item>
  </>
);

export const Default: Story = { args: { children: trail } };
export const ChevronSeparator: Story = { args: { separator: '›', children: trail } };
