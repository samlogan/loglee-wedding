import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';

import type { FrameAspectRatio } from '@/tools/sanity/schema/common/aspectRatioFields';

import AspectRatioFrame from '.';

const RATIOS: Record<Exclude<FrameAspectRatio, 'fullscreen'>, number> = {
  '21x9': 21 / 9,
  '16x9': 16 / 9,
  '3x2': 3 / 2,
  '4x3': 4 / 3,
  '1x1': 1,
  '4x5': 4 / 5,
  '3x4': 3 / 4,
  '9x16': 9 / 16
};

const ratioOf = (element: Element) => {
  const { width, height } = element.getBoundingClientRect();
  return width / height;
};

/**
 * `Foundations`: structural infrastructure with no content of its own. It measures rather than
 * shows — the grey is only there so the box is visible.
 */
const meta = {
  title: 'Foundations/Aspect Ratio Frame',
  component: AspectRatioFrame,
  tags: ['autodocs'],
  args: {
    children: <div style={{ background: 'var(--bg-accent)', inset: 0, position: 'absolute' }} />,
    desktop: '21x9',
    mobile: '4x5'
  },
  parameters: {
    layout: 'fullscreen',
    viewport: {
      options: {
        desktop: { name: 'Desktop (1280px)', styles: { height: '900px', width: '1280px' }, type: 'desktop' },
        phone: { name: 'Phone (414px)', styles: { height: '896px', width: '414px' }, type: 'mobile' }
      }
    }
  }
} satisfies Meta<typeof AspectRatioFrame>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Every ratio an editor can pick lands as that ratio on desktop. */
export const DesktopRatios: Story = {
  globals: { viewport: { value: 'desktop' } },
  render: (args) => (
    <>
      {(Object.keys(RATIOS) as (keyof typeof RATIOS)[]).map((ratio) => (
        <AspectRatioFrame key={ratio} {...args} className={`ratio-${ratio}`} desktop={ratio} />
      ))}
    </>
  ),
  play: async ({ canvasElement }) => {
    for (const [ratio, expected] of Object.entries(RATIOS)) {
      await expect(ratioOf(canvasElement.querySelector(`.ratio-${ratio}`) as Element)).toBeCloseTo(expected, 1);
    }
  }
};

/** Below the tablet breakpoint the mobile ratio takes over. */
export const Mobile: Story = {
  args: { mobile: '1x1' },
  globals: { viewport: { value: 'phone' } },
  play: async ({ canvasElement }) => {
    await expect(ratioOf(canvasElement.firstElementChild as Element)).toBeCloseTo(1, 1);
  }
};

/** Full screen: the height of the viewport, whatever its width. */
export const Fullscreen: Story = {
  args: { desktop: 'fullscreen' },
  globals: { viewport: { value: 'desktop' } },
  play: async ({ canvasElement }) => {
    const frame = canvasElement.firstElementChild as Element;
    await expect(frame.getBoundingClientRect().height).toBeCloseTo(window.innerHeight, 0);
  }
};

export const FullscreenMobile: Story = {
  args: { mobile: 'fullscreen' },
  globals: { viewport: { value: 'phone' } },
  play: async ({ canvasElement }) => {
    const frame = canvasElement.firstElementChild as Element;
    await expect(frame.getBoundingClientRect().height).toBeCloseTo(window.innerHeight, 0);
  }
};

/** An unset pair falls back to 21:9 on desktop. */
export const Unset: Story = {
  args: { desktop: null, mobile: null },
  globals: { viewport: { value: 'desktop' } },
  play: async ({ canvasElement }) => {
    await expect(ratioOf(canvasElement.firstElementChild as Element)).toBeCloseTo(21 / 9, 1);
  }
};

/** Rounded — for a frame inside the page container. */
export const Rounded: Story = {
  args: { rounded: true },
  play: async ({ canvasElement }) => {
    const frame = canvasElement.firstElementChild as Element;
    await expect(Number.parseFloat(getComputedStyle(frame).borderTopLeftRadius)).toBeGreaterThan(0);
  }
};
