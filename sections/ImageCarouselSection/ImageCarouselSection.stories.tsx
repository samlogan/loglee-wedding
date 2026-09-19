import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';

import type { IImageCarouselSection } from '@/tools/sanity/schema/sections/imageCarouselSection';
import mockImage from '@/tools/storybook/mockImage';
import sectionFixture from '@/tools/storybook/sectionFixture';

import ImageCarouselSection from '.';

/** Five camera photos, all the same 3:2 landscape — the section varies them itself. */
const SHAPES: [number, number][] = Array.from({ length: 5 }, () => [1600, 1067]);

/**
 * A mock image whose *recorded* shape is exactly the one asked for. `mockImage` draws a real asset
 * from the fixtures, the nearest in shape it has — which, once real photos are in the dataset, is
 * often not the shape a story is about. The carousel reads the asset's dimensions, so pinning them
 * keeps these stories about the carousel rather than about what happens to be uploaded; the photo
 * shown is still a real one, cropped to fit.
 */
const shaped = (width: number, height: number, seed: string, altText: string) => {
  const image = mockImage({ altText, height, seed, width });
  return {
    ...image,
    asset: { ...image.asset, metadata: { ...image.asset?.metadata, dimensions: { height, width } } },
    crop: undefined
  } as typeof image;
};

const MOCK: IImageCarouselSection = {
  images: SHAPES.map(([width, height], index) => ({
    _key: `image-${index}`,
    ...shaped(width, height, `carousel-${index}`, `Photo ${index + 1}`)
  })),
  speed: 'medium'
};

/** Portrait uploads, for the stories that measure the standard slide width. */
const PORTRAIT: IImageCarouselSection = {
  images: SHAPES.map((_, index) => ({
    _key: `portrait-${index}`,
    ...shaped(1200, 1600, `carousel-p-${index}`, `Portrait ${index + 1}`)
  })),
  speed: 'medium'
};

const PUBLISHED = sectionFixture<IImageCarouselSection>('imageCarouselSection') ?? MOCK;

const slidesOf = (canvasElement: HTMLElement) => [...canvasElement.querySelectorAll('li')] as HTMLElement[];

/**
 * Photographs moving slowly and continuously across the page, each at the shape it was uploaded at.
 * No controls, and it never stops by itself; it stands still for readers who ask for reduced motion.
 */
const meta = {
  title: 'Sections/Image Carousel',
  component: ImageCarouselSection,
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
} satisfies Meta<typeof ImageCarouselSection>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Real data from the dataset once a carousel is published, the mixed-shape mock until then. */
export const Default: Story = {
  args: PUBLISHED
};

/**
 * Every slide close to its photograph's shape but different from its neighbours — in shape and so in
 * height, across the loop's seam too — and each photograph read once: the repeats that make the loop
 * seamless are hidden from assistive technology. All five uploads here are the same 3:2 landscape.
 */
export const MixedShapes: Story = {
  args: MOCK,
  globals: { viewport: { value: 'desktop' } },
  play: async ({ canvasElement }) => {
    const slides = slidesOf(canvasElement);
    const boxes = slides.map((slide) => slide.getBoundingClientRect());
    const half = slides.length / 2;

    for (let index = 0; index < half; index += 1) {
      const next = boxes[(index + 1) % half];
      await expect(Math.abs(boxes[index].height - next.height)).toBeGreaterThan(1);
    }

    // Close to 3:2 — the neighbouring steps on the ladder, all landscape, none a portrait.
    for (const box of boxes) {
      await expect(box.width / box.height).toBeGreaterThanOrEqual(4 / 3 - 0.01);
      await expect(box.width / box.height).toBeLessThanOrEqual(16 / 9 + 0.01);
    }

    // Five photographs, each exposed once.
    const visible = slides.filter((slide) => slide.getAttribute('aria-hidden') !== 'true');
    await expect(visible).toHaveLength(SHAPES.length);
    await expect(within(canvasElement).getAllByRole('img')).toHaveLength(SHAPES.length);
  }
};

/** Landscape slides are wider than portrait ones, and shorter. */
export const LandscapeWider: Story = {
  args: {
    ...MOCK,
    images: [0, 1]
      .flatMap((index) => [PORTRAIT.images?.[index], MOCK.images?.[index]])
      .filter((image) => image !== undefined)
  },
  globals: { viewport: { value: 'desktop' } },
  play: async ({ canvasElement }) => {
    const [portrait, landscape] = slidesOf(canvasElement).map((slide) => slide.getBoundingClientRect());

    await expect(landscape.width).toBeGreaterThan(portrait.width * 1.2);
    await expect(landscape.height).toBeLessThan(portrait.height);
  }
};

/** Four and a half standard widths across a desktop (landscape slides span more than one). */
export const Desktop: Story = {
  args: PORTRAIT,
  globals: { viewport: { value: 'desktop' } },
  play: async ({ canvasElement }) => {
    const [slide] = slidesOf(canvasElement);
    const pitch = slide.getBoundingClientRect().width + Number.parseFloat(getComputedStyle(slide).marginRight);

    await expect(window.innerWidth / pitch).toBeCloseTo(4.5, 0);
  }
};

/**
 * One and a half slides across a phone, and no slide wider than the standard width there — a
 * landscape photo is shorter rather than wider than the screen.
 */
export const Mobile: Story = {
  args: MOCK,
  globals: { viewport: { value: 'phone' } },
  play: async ({ canvasElement }) => {
    const slides = slidesOf(canvasElement);
    const [first] = slides;
    const pitch = first.getBoundingClientRect().width + Number.parseFloat(getComputedStyle(first).marginRight);

    await expect(window.innerWidth / pitch).toBeCloseTo(1.5, 1);
    // All five uploads are landscape; every slide is still one standard width.
    for (const slide of slides) {
      await expect(slide.getBoundingClientRect().width).toBeCloseTo(first.getBoundingClientRect().width, 0);
    }
  }
};

/** Moving, and the track holds two identical halves so the loop has no seam. */
export const Moving: Story = {
  args: MOCK,
  play: async ({ canvasElement }) => {
    const track = canvasElement.querySelector('ul') as HTMLElement;
    const slides = slidesOf(canvasElement);

    await expect(getComputedStyle(track).animationName).not.toBe('none');
    await expect(slides.length % 2).toBe(0);

    // Keeps moving under the pointer.
    await userEvent.hover(slides[0]);
    await expect(getComputedStyle(track).animationPlayState).toBe('running');
  }
};

/** Two photographs are repeated within each half, so even a short strip fills a wide screen. */
export const TwoImages: Story = {
  args: { ...MOCK, images: MOCK.images?.slice(0, 2) },
  globals: { viewport: { value: 'desktop' } },
  play: async ({ canvasElement }) => {
    const track = canvasElement.querySelector('ul') as HTMLElement;

    await expect(track.getBoundingClientRect().width / 2).toBeGreaterThanOrEqual(window.innerWidth);
    await expect(within(canvasElement).getAllByRole('img')).toHaveLength(2);
  }
};

export const Slow: Story = { args: { ...MOCK, speed: 'slow' } };

export const Fast: Story = { args: { ...MOCK, speed: 'fast' } };

/** No images — the section renders nothing. */
export const Empty: Story = {
  args: { images: [] },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-name="ImageCarouselSection"]')).toBeNull();
  }
};
