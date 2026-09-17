import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import Link from '.';

const meta = {
  title: 'Foundations/Link',
  component: Link,
  tags: ['autodocs'],
  args: {
    text: 'Click me',
    href: '/sample'
  }
} satisfies Meta<typeof Link>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const PrimaryRounded: Story = {
  args: { theme: 'primary', variant: 'rounded', size: 'md' }
};

export const SecondaryPill: Story = {
  args: { theme: 'secondary', variant: 'pill', size: 'md' }
};

export const Outline: Story = {
  args: { theme: 'primary', variant: 'square', size: 'md', outline: true }
};

export const ExternalLink: Story = {
  args: { linkType: 'external', externalLink: 'https://example.com', text: 'Visit example.com' }
};

export const PhoneLink: Story = {
  args: { linkType: 'phone', phone: '+61400000000', text: 'Call us' }
};

// The remaining size steps. Every other story uses `md`, so these are the only exercise `sm` and
// `lg` get — and each is a browser component test under the `storybook` Vitest project.
export const SmallSize: Story = {
  args: { text: 'Small link', theme: 'primary', variant: 'rounded', size: 'sm' }
};

export const LargeSize: Story = {
  args: { text: 'Large link', theme: 'primary', variant: 'rounded', size: 'lg' }
};

// `content` is the variant used for links inside rich text — no button chrome, so it looks nothing
// like the other three.
export const ContentVariant: Story = {
  args: { text: 'A link inside a paragraph', variant: 'content' }
};

// `email` carries the guard that stops an empty address rendering `mailto:undefined`.
//
// There is deliberately no `ActionLink` story to match. One was added here and removed on review:
// `linkType: 'action'` takes no branch in the component and falls through to the plain `<span>`, so
// the story rendered a span and asserted nothing while its name claimed otherwise — the same defect
// as the two SocialsShare stories deleted in this branch. See the note in the component.
export const EmailLink: Story = {
  args: { text: 'Email us', linkType: 'email', email: 'hello@example.com' }
};
