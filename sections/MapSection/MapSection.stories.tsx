import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import type { IMapSection } from '@/tools/sanity/schema/sections/mapSection';
import { mockBlock } from '@/tools/storybook/mockBlockContent';
import mockButton from '@/tools/storybook/mockButton';
import { mockExternalLink } from '@/tools/storybook/mockLink';
import sectionFixture from '@/tools/storybook/sectionFixture';

import MapSection from '.';

/*
 * Approximately the venue on Jamberoo Mountain Rd. Zoom 14 frames it with the
 * valley road either side, which is the view a guest driving in needs.
 */
const MOCK: IMapSection = {
  location: { lat: -34.6563, lng: 150.7449, zoom: 14 },
  address: '406 Jamberoo Mountain Rd',
  badge: 'Map · Sydney → Jamberoo, 90 min',
  link: mockButton('Open in maps', mockExternalLink('https://maps.google.com/?q=406+Jamberoo+Mountain+Rd')),
  aspectRatioDesktop: '21x9',
  aspectRatioMobile: '4x5'
};

const PUBLISHED = sectionFixture<IMapSection>('mapSection') ?? MOCK;

/** The `AspectRatioFrame` the card fills. */
const frameOf = (canvasElement: HTMLElement) =>
  canvasElement.querySelector('[data-name="MapSection"] [class*="frame"]') as HTMLElement;

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
    const place = (PUBLISHED.address || PUBLISHED.label)?.trim();

    await expect(region).toHaveAccessibleName(place ? `Map of ${place}` : 'Map');
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
  args: { ...MOCK, address: undefined, badge: undefined },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('region')).toHaveAccessibleName('Map');
  }
};

/**
 * The FAQ card's furniture over the full-bleed map: the corner chip, and the address bar with its
 * "Open in maps" link — the bar hugging its contents at the page gutter rather than spanning the map.
 */
export const ChipAndBar: Story = {
  args: MOCK,
  globals: { viewport: { value: 'desktop' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const frame = frameOf(canvasElement).getBoundingClientRect();

    await expect(canvas.getByText(MOCK.badge as string)).toBeVisible();
    await expect(canvas.getByText(MOCK.address as string)).toBeVisible();

    const link = canvas.getByRole('link', { name: /Open in maps/ });
    await expect(link).toBeVisible();

    const bar = link.parentElement as HTMLElement;
    await expect(bar.getBoundingClientRect().width).toBeLessThan(frame.width / 2);
  }
};

/** With no link authored, "Open in maps" is still offered, pointing at the pin. */
export const DefaultMapsLink: Story = {
  args: { ...MOCK, link: undefined },
  play: async ({ canvasElement }) => {
    const { lat, lng } = MOCK.location as { lat: number; lng: number };

    await expect(within(canvasElement).getByRole('link', { name: /Open in maps/ })).toHaveAttribute(
      'href',
      `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    );
  }
};

/** A section saved before the address bar existed keeps its name through the old `label` field. */
export const LegacyLabel: Story = {
  args: { ...MOCK, address: undefined, label: 'Jamberoo Valley Lodge' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('region')).toHaveAccessibleName('Map of Jamberoo Valley Lodge');
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

/**
 * Contained: inside the page container, in the Select Player section's dashed panel — the map inset
 * from the dashed edge, its corners a step tighter than the panel's.
 */
export const Contained: Story = {
  args: { ...MOCK, width: 'contained' },
  globals: { viewport: { value: 'desktop' } },
  play: async ({ canvasElement }) => {
    const frame = frameOf(canvasElement);
    const frameStyle = getComputedStyle(frame);
    const card = frame.querySelector('[class*="mapCard"]') as HTMLElement;

    await expect(frame.getBoundingClientRect().width).toBeLessThan(window.innerWidth - 20);
    await expect(frameStyle.borderTopStyle).toBe('dashed');
    await expect(Number.parseFloat(frameStyle.borderTopLeftRadius)).toBeGreaterThan(0);

    // Inset from the dashed edge, with tighter corners.
    await expect(card.getBoundingClientRect().left - frame.getBoundingClientRect().left).toBeGreaterThan(4);
    await expect(Number.parseFloat(getComputedStyle(card).borderTopLeftRadius)).toBeLessThan(
      Number.parseFloat(frameStyle.borderTopLeftRadius)
    );
  }
};

/** Full width is the default: edge to edge, square corners. */
export const FullWidth: Story = {
  args: { ...MOCK, width: 'full' },
  globals: { viewport: { value: 'desktop' } },
  play: async ({ canvasElement }) => {
    const frame = frameOf(canvasElement);

    await expect(frame.getBoundingClientRect().width).toBeCloseTo(window.innerWidth, 0);
    await expect(getComputedStyle(frame).borderTopLeftRadius).toBe('0px');
    // No panel at the viewport's edges.
    await expect(getComputedStyle(frame).borderTopStyle).toBe('none');
  }
};

const HEADER: Pick<IMapSection, 'content' | 'title'> = {
  content: [
    mockBlock(
      'normal',
      'About 90 minutes south of Sydney. Take the M1 to Kiama, then Jamberoo Mountain Road — the Lodge is on the left before the climb.'
    )
  ],
  title: '<h2>Getting there</h2>'
};

/**
 * With a title and copy above the map, on the page's grid even though the map runs edge to edge —
 * side by side on a desktop.
 */
export const WithTitleAndContent: Story = {
  args: { ...MOCK, ...HEADER },
  globals: { viewport: { value: 'desktop' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const heading = canvas.getByRole('heading', { level: 2, name: 'Getting there' });
    const copy = canvas.getByText(/90 minutes south of Sydney/);
    const frame = frameOf(canvasElement).getBoundingClientRect();

    // Above the map.
    await expect(copy.getBoundingClientRect().bottom).toBeLessThan(frame.top);
    // Inset from the viewport's edge although the map is not.
    await expect(heading.getBoundingClientRect().left).toBeGreaterThan(frame.left + 10);
    // Side by side at this width.
    await expect(copy.getBoundingClientRect().left).toBeGreaterThan(heading.getBoundingClientRect().left + 100);
  }
};

/** Contained, with a title and copy: both line up with the panel below them. */
export const ContainedWithTitleAndContent: Story = {
  args: { ...MOCK, ...HEADER, width: 'contained' },
  globals: { viewport: { value: 'desktop' } },
  play: async ({ canvasElement }) => {
    const heading = within(canvasElement).getByRole('heading', { level: 2, name: 'Getting there' });
    const frame = frameOf(canvasElement).getBoundingClientRect();

    await expect(heading.getBoundingClientRect().left).toBeCloseTo(frame.left, 0);
  }
};

/** Stacked on a phone. */
export const TitleAndContentMobile: Story = {
  args: { ...MOCK, ...HEADER },
  globals: { viewport: { value: 'phone' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const heading = canvas.getByRole('heading', { level: 2, name: 'Getting there' });
    const copy = canvas.getByText(/90 minutes south of Sydney/);

    await expect(copy.getBoundingClientRect().top).toBeGreaterThan(heading.getBoundingClientRect().bottom - 1);
  }
};

/** A title emptied in the Studio stores `<h2></h2>` — no header, and no gap above the map. */
export const EmptyTitle: Story = {
  args: { ...MOCK, content: [], title: '<h2></h2>' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('heading')).toBeNull();
  }
};
