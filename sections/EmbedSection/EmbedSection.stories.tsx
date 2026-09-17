import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import type { IEmbedSection } from '@/tools/sanity/schema/sections/embedSection';
import sectionFixture from '@/tools/storybook/sectionFixture';

import EmbedSection from '.';

const meta = {
  title: 'Sections/Embed',
  component: EmbedSection,
  tags: ['autodocs']
} satisfies Meta<typeof EmbedSection>;

export default meta;

type Story = StoryObj<typeof meta>;

const data = sectionFixture<IEmbedSection>('embedSection') ?? {
  embed: 'https://www.youtube.com/embed/aqz-KE-bpKQ'
};

export const Default: Story = { args: data };

// Editors paste the provider's whole snippet as often as they paste a URL. The component pulls the
// `src` out rather than injecting the markup, so both render identically.
export const FromIframeSnippet: Story = {
  args: {
    embed: '<iframe width="560" height="315" src="https://www.youtube.com/embed/aqz-KE-bpKQ" allowfullscreen></iframe>'
  }
};

// The empty state is a real state — a section can be added before its URL is filled in — so it is
// documented rather than left to be discovered on a live page.
export const NoEmbedSet: Story = { args: { embed: '' } };

// A value the component cannot safely use renders the same placeholder as an empty one.
//
// The literal below is the assertion, not an oversight: `resolveEmbedUrl` allows only http(s), and
// this story is the standing proof that a `javascript:` URL from a CMS field never reaches the
// iframe's `src`. Removing it would remove the check.
// eslint-disable-next-line no-script-url
export const UnusableValue: Story = { args: { embed: 'javascript:alert(1)' } };
