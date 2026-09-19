import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import type { IMapSection, MapAspectRatio } from '@/tools/sanity/schema/sections/mapSection';
import sectionFixture from '@/tools/storybook/sectionFixture';

import MapSection from '.';

/*
 * Approximately the venue on Jamberoo Mountain Rd. Zoom 14 frames it with the
 * valley road either side, which is the view a guest driving in needs.
 */
const MOCK: IMapSection = {
  location: { lat: -34.6563, lng: 150.7449, zoom: 14 },
  label: '406 Jamberoo Mountain Rd',
  aspectRatioDesktop: '21x9',
  aspectRatioMobile: '4x5'
};

const PUBLISHED = sectionFixture<IMapSection>('mapSection') ?? MOCK;

const RATIOS: Record<Exclude<MapAspectRatio, 'fullscreen'>, number> = {
  '21x9': 21 / 9,
  '16x9': 16 / 9,
  '3x2': 3 / 2,
  '4x3': 4 / 3,
  '1x1': 1,
  '4x5': 4 / 5,
  '3x4': 3 / 4,
  '9x16': 9 / 16
};

const frameOf = (canvasElement: HTMLElement) => {
  const region = within(canvasElement).getByRole('region');
  return region.parentElement as HTMLElement;
};

const ratioOf = (element: HTMLElement) => {
  const { width, height } = element.getBoundingClientRect();
  return width / height;
};

/**
 * A full-bleed live map of one place. Needs `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to draw tiles; without
 * it the frame is still laid out at the chosen ratio, as a flat `--bg-accent` surface.
 */
const meta = {
  title: 'Sections/Map',
  component: MapSection,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    viewport: {
      options: {
        desktop: { name: 'Desktop (1280px)', styles: { height: '900px', width: '1280px' }, type: 'desktop' },
        phone: { name: 'Phone (414px)', styles: { height: '896px', width: '414px' }, type: 'mobile' }
      }
    }
  }
} satisfies Meta<typeof MapSection>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Real data from the dataset when a map section is published, the venue otherwise. */
export const Default: Story = {
  args: PUBLISHED,
  play: async ({ canvasElement }) => {
    const region = within(canvasElement).getByRole('region');
    const label = PUBLISHED.label?.trim();

    await expect(region).toHaveAccessibleName(label ? `Map of ${label}` : 'Map');
  }
};

/** Each desktop ratio an editor can pick lands as that ratio. */
export const DesktopRatios: Story = {
  args: MOCK,
  globals: { viewport: { value: 'desktop' } },
  render: (args) => (
    <>
      {(Object.keys(RATIOS) as (keyof typeof RATIOS)[]).map((ratio) => (
        <div key={ratio} data-ratio={ratio}>
          <MapSection {...args} aspectRatioDesktop={ratio} />
        </div>
      ))}
    </>
  ),
  play: async ({ canvasElement }) => {
    for (const [ratio, expected] of Object.entries(RATIOS)) {
      const wrapper = canvasElement.querySelector(`[data-ratio="${ratio}"]`) as HTMLElement;
      await expect(ratioOf(frameOf(wrapper))).toBeCloseTo(expected, 1);
    }
  }
};

/** The mobile ratio takes over below the tablet breakpoint. */
export const Mobile: Story = {
  args: { ...MOCK, aspectRatioMobile: '1x1' },
  globals: { viewport: { value: 'phone' } },
  play: async ({ canvasElement }) => {
    await expect(ratioOf(frameOf(canvasElement))).toBeCloseTo(1, 1);
  }
};

/** Full screen: the height of the viewport, whatever its width. */
export const Fullscreen: Story = {
  args: { ...MOCK, aspectRatioDesktop: 'fullscreen' },
  globals: { viewport: { value: 'desktop' } },
  play: async ({ canvasElement }) => {
    const frame = frameOf(canvasElement);

    await expect(frame.getBoundingClientRect().height).toBeCloseTo(window.innerHeight, 0);
  }
};

/** Full screen on a phone, with a ratio kept on desktop. */
export const FullscreenMobile: Story = {
  args: { ...MOCK, aspectRatioMobile: 'fullscreen' },
  globals: { viewport: { value: 'phone' } },
  play: async ({ canvasElement }) => {
    await expect(frameOf(canvasElement).getBoundingClientRect().height).toBeCloseTo(window.innerHeight, 0);
  }
};

/** Without a place name the map is still named, just generically. */
export const WithoutLabel: Story = {
  args: { ...MOCK, label: undefined },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('region')).toHaveAccessibleName('Map');
  }
};

/** No location — the section renders nothing rather than an empty band. */
export const Empty: Story = {
  args: { ...MOCK, location: { lat: null, lng: null } },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-name="MapSection"]')).toBeNull();
  }
};

export const Dark: Story = {
  args: MOCK,
  globals: { theme: 'dark' },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-name="MapSection"]')).toHaveAttribute('data-theme', 'dark');
  }
};
