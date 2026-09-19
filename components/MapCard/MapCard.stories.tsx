import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import mockButton from '@/tools/storybook/mockButton';
import mockImage from '@/tools/storybook/mockImage';
import { mockExternalLink } from '@/tools/storybook/mockLink';

import MapCard from '.';

const LOCATION = { lat: -34.654_861_2, lng: 150.733_663_8, zoom: 12 };

/**
 * `Surfaces`: the card presents a place — a map or a picture of one — with its address and a way to
 * open it elsewhere. The FAQ's left rail and the RSVP page's rail both draw it.
 */
const meta = {
  title: 'Surfaces/Map Card',
  component: MapCard,
  tags: ['autodocs'],
  args: {
    address: '406 Jamberoo Mountain Rd',
    badge: 'Map · Sydney → Jamberoo, 90 min',
    link: mockButton('Open in maps', mockExternalLink('https://maps.google.com/?q=406+Jamberoo+Mountain+Rd')),
    location: LOCATION
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '440px' }}>
        <Story />
      </div>
    )
  ]
} satisfies Meta<typeof MapCard>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A pinned location: the live map, named for the address it shows. */
export const Default: Story = {
  args: { theme: 'light' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('region', { name: 'Map of 406 Jamberoo Mountain Rd' })).toBeTruthy();
    await expect(canvas.getByRole('link', { name: /Open in maps/ })).toBeVisible();
  }
};

/** No location: the image is the fallback. */
export const Image: Story = {
  args: { location: undefined, image: mockImage({ seed: 'map-card', width: 880, height: 520 }) },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('region')).toBeNull();
  }
};

/** A labelled link with nowhere to go points at the pin in Google Maps. */
export const LinkFromPin: Story = {
  args: { link: mockButton('Open in maps', { linkType: 'external' }) },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('link', { name: /Open in maps/ })).toHaveAttribute(
      'href',
      `https://www.google.com/maps/search/?api=1&query=${LOCATION.lat},${LOCATION.lng}`
    );
  }
};

/** The page's theme flips the map to dark; the bar's link takes the inverse so it stays readable. */
export const Dark: Story = {
  args: { theme: 'dark' },
  globals: { theme: 'dark' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('link', { name: /Open in maps/ })).toHaveAttribute(
      'data-theme',
      'light'
    );
  }
};

/** Nothing to show renders nothing. */
export const Empty: Story = {
  args: { address: undefined, badge: undefined, link: undefined, location: undefined },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[class*="mapCard"]')).toBeNull();
  }
};

/** Filling a frame edge to edge — `MapSection` at full width: square corners, chip and bar on the page gutter. */
export const FillBleed: Story = {
  args: { fill: 'bleed' },
  decorators: [
    (Story) => (
      <div style={{ height: '420px' }}>
        <Story />
      </div>
    )
  ],
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector('[class*="mapCard"]') as HTMLElement;
    await expect(card.getBoundingClientRect().height).toBeCloseTo(420, 0);
    await expect(getComputedStyle(card).borderTopLeftRadius).toBe('0px');
  }
};

/** Filling a frame inside the page container — `MapSection` contained: the card's own radius. */
export const FillContained: Story = {
  args: { fill: 'contained' },
  decorators: [
    (Story) => (
      <div style={{ height: '420px' }}>
        <Story />
      </div>
    )
  ],
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector('[class*="mapCard"]') as HTMLElement;
    await expect(card.getBoundingClientRect().height).toBeCloseTo(420, 0);
    await expect(Number.parseFloat(getComputedStyle(card).borderTopLeftRadius)).toBeGreaterThan(0);
  }
};
