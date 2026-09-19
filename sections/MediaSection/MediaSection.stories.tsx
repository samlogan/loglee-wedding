import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import type { IMediaSection } from '@/tools/sanity/schema/sections/mediaSection';
import mockImage from '@/tools/storybook/mockImage';
import sectionFixture from '@/tools/storybook/sectionFixture';

import MediaSection from '.';

const IMAGE: IMediaSection = {
  mediaType: 'image',
  image: mockImage({ seed: 'media-section', width: 2400, height: 1350 }),
  aspectRatioDesktop: 'fullscreen',
  aspectRatioMobile: '4x5'
};

const YOUTUBE: IMediaSection = {
  mediaType: 'video',
  videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  aspectRatioDesktop: '16x9',
  aspectRatioMobile: '4x5'
};

const PUBLISHED = sectionFixture<IMediaSection>('mediaSection') ?? IMAGE;

const sectionOf = (canvasElement: HTMLElement) =>
  canvasElement.querySelector('[data-name="MediaSection"]') as HTMLElement | null;

const frameOf = (canvasElement: HTMLElement) => sectionOf(canvasElement)?.querySelector('div') as HTMLElement;

/**
 * One image or one YouTube / Vimeo video, edge to edge, at an editor-chosen shape per viewport. The
 * shapes themselves are measured in `Foundations/Aspect Ratio Frame`; these stories check what goes
 * in the frame.
 */
const meta = {
  title: 'Sections/Media',
  component: MediaSection,
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
} satisfies Meta<typeof MediaSection>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Real data from the dataset when a media section is published, an image otherwise. */
export const Default: Story = {
  args: PUBLISHED
};

/** A full-screen image, cropped to fill the viewport around its hotspot. */
export const Image: Story = {
  args: IMAGE,
  globals: { viewport: { value: 'desktop' } },
  play: async ({ canvasElement }) => {
    const frame = frameOf(canvasElement);
    const img = within(frame).getByRole('img');

    await expect(frame.getBoundingClientRect().height).toBeCloseTo(window.innerHeight, 0);
    // Fills the frame rather than sitting at its own ratio.
    await expect(img.getBoundingClientRect().height).toBeCloseTo(frame.getBoundingClientRect().height, 0);
    await expect(getComputedStyle(img).objectFit).toBe('cover');
  }
};

/** On a phone the mobile ratio takes over. */
export const ImageMobile: Story = {
  args: IMAGE,
  globals: { viewport: { value: 'phone' } },
  play: async ({ canvasElement }) => {
    const { width, height } = frameOf(canvasElement).getBoundingClientRect();

    await expect(width / height).toBeCloseTo(4 / 5, 1);
  }
};

export const YouTube: Story = {
  args: YOUTUBE,
  globals: { viewport: { value: 'desktop' } },
  play: async ({ canvasElement }) => {
    const frame = frameOf(canvasElement);
    const { width, height } = frame.getBoundingClientRect();

    await expect(width / height).toBeCloseTo(16 / 9, 1);
    // No image in a video section, even one left behind by an editor who switched type.
    await expect(within(frame).queryByRole('img')).toBeNull();
  }
};

export const Vimeo: Story = {
  args: { ...YOUTUBE, videoUrl: 'https://vimeo.com/76979871' }
};

/** Autoplay: muted and looping, with the controls kept so it can be paused. */
export const Ambient: Story = {
  args: { ...YOUTUBE, autoPlay: true, aspectRatioDesktop: 'fullscreen' }
};

/** Switched to video with an image still in the document: the video wins, the image is not drawn. */
export const VideoWithLeftoverImage: Story = {
  args: { ...YOUTUBE, image: IMAGE.image },
  play: async ({ canvasElement }) => {
    await expect(within(frameOf(canvasElement)).queryByRole('img')).toBeNull();
  }
};

/** A link that is not YouTube or Vimeo renders nothing — not `Video`'s "unsupported" message. */
export const UnsupportedVideo: Story = {
  args: { ...YOUTUBE, videoUrl: 'https://example.com/film.mp4' },
  play: async ({ canvasElement }) => {
    await expect(sectionOf(canvasElement)).toBeNull();
    await expect(canvasElement.textContent).not.toContain('Unsupported');
  }
};

/** No image — the section renders nothing rather than an empty band. */
export const Empty: Story = {
  args: { ...IMAGE, image: undefined },
  play: async ({ canvasElement }) => {
    await expect(sectionOf(canvasElement)).toBeNull();
  }
};

export const Dark: Story = {
  args: IMAGE,
  globals: { theme: 'dark' },
  play: async ({ canvasElement }) => {
    await expect(sectionOf(canvasElement)).toHaveAttribute('data-theme', 'dark');
  }
};
