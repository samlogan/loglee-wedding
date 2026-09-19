import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, waitFor, within } from 'storybook/test';

import CountdownBanner from '.';

/**
 * `Navigation`: site chrome, drawn above the header on every page.
 *
 * The count runs against the real clock, so the stories choose targets relative to *now* rather than
 * pinning a date that would expire.
 */
const meta = {
  title: 'Navigation/Countdown Banner',
  component: CountdownBanner,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' }
} satisfies Meta<typeof CountdownBanner>;

export default meta;

type Story = StoryObj<typeof meta>;

const inFromNow = (ms: number) => new Date(Date.now() + ms).toISOString();

/** The wedding itself — 3pm on Friday 12 February 2027, Sydney time. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const banner = within(canvasElement).getByRole('complementary', { name: 'Countdown to the wedding' });

    // Filled in on the client, in words a screen reader can say.
    await waitFor(() => expect(banner.textContent).toMatch(/\d+ days? · \d{2} hrs · \d{2} min · \d{2} sec/));
    // The count alone — no date label beside it.
    await expect(banner.textContent).not.toMatch(/until/i);
  }
};

/** Ticks once a second. */
export const Ticking: Story = {
  args: { target: inFromNow(2 * 60 * 60 * 1000 + 5000) },
  play: async ({ canvasElement }) => {
    const banner = within(canvasElement).getByRole('complementary');
    await waitFor(() => expect(banner.textContent).toMatch(/0 days · 02 hrs · 00 min/));
    const first = banner.textContent;

    await waitFor(() => expect(banner.textContent).not.toBe(first), { timeout: 2500 });
  }
};

/** Once the moment passes, the count gives way to a line saying so. */
export const Arrived: Story = {
  args: { target: inFromNow(-60_000) },
  play: async ({ canvasElement }) => {
    const banner = within(canvasElement).getByRole('complementary');

    await waitFor(() => expect(banner).toHaveTextContent("It's wedding weekend"));
    await expect(banner.textContent).not.toMatch(/sec/);
  }
};

/** A phone: the count fits on one line without being cut. */
export const Narrow: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: '360px' }}>
        <Story />
      </div>
    )
  ],
  play: async ({ canvasElement }) => {
    const banner = within(canvasElement).getByRole('complementary');
    await waitFor(() => expect(banner.textContent).toMatch(/sec/));

    await expect(banner.scrollWidth).toBeLessThanOrEqual(banner.clientWidth);
  }
};
