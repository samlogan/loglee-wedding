import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import Map from '.';

/**
 * `Surfaces`: a map presents a place — content that is not its own — in a box it is handed.
 *
 * The component fills its parent, so every story gives it one. Tiles need
 * `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`; without it the box is a flat `--bg-accent` surface.
 */
const meta = {
  title: 'Surfaces/Map',
  component: Map,
  tags: ['autodocs'],
  args: {
    // Approximately the venue on Jamberoo Mountain Rd — close enough to frame the valley.
    location: { lat: -34.6563, lng: 150.7449, zoom: 14 },
    label: 'Map of 406 Jamberoo Mountain Rd'
  },
  decorators: [
    (Story) => (
      <div style={{ height: '420px', width: '100%' }}>
        <Story />
      </div>
    )
  ]
} satisfies Meta<typeof Map>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const region = within(canvasElement).getByRole('region', { name: 'Map of 406 Jamberoo Mountain Rd' });

    // Fills the box it is given rather than bringing a size of its own.
    await expect(region.getBoundingClientRect().height).toBeCloseTo(420, 0);
  }
};

/** No map controls — for small cards, where they would cover the picture. */
export const Compact: Story = {
  args: { variant: 'compact' }
};

export const Light: Story = {
  args: { theme: 'light' }
};

export const Dark: Story = {
  args: { theme: 'dark' },
  globals: { theme: 'dark' }
};

/** A cleared geopoint renders nothing. */
export const WithoutLocation: Story = {
  args: { location: { lat: null, lng: null } },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('region')).toBeNull();
  }
};
