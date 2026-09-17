import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { bandStyle, Content, Row, useMeasure } from '@/tools/storybook/measure';

import Section from '.';
import type { SectionSpacing } from './types';

const meta = {
  title: 'Foundations/Section',
  component: Section,
  tags: ['autodocs'],
  args: {
    name: 'StorybookSection',
    children: 'Section content goes here.'
  }
} satisfies Meta<typeof Section>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Light: Story = { args: { theme: 'light' } };
export const Dark: Story = { args: { theme: 'dark' } };

export const FullWidth: Story = { args: { theme: 'light', full: true } };

export const NoSpacing: Story = {
  args: { theme: 'light', removeTopSpacing: true, removeBottomSpacing: true }
};

/**
 * The `as` prop, which changes the rendered tag without changing anything visible.
 *
 * Worth a story precisely because it is invisible: `header` and `footer` are landmark elements, so
 * choosing the wrong one is an accessibility change that no screenshot would catch. Inspect the DOM
 * rather than the pixels here.
 */
export const AsHeader: Story = { args: { theme: 'light', as: 'header' } };
export const AsFooter: Story = { args: { theme: 'light', as: 'footer' } };
export const AsDiv: Story = { args: { theme: 'light', as: 'div' } };

/**
 * `containerWidth` is forwarded to the inner `Container`, so a Section can hold a narrower measure
 * than the page default. `Foundations/Container` → `Width Scale` measures what each cap resolves to.
 */
export const ContainerWidthSmall: Story = { args: { theme: 'light', containerWidth: 'sm' } };
export const ContainerWidthExtraLarge: Story = { args: { theme: 'light', containerWidth: 'xl' } };

const STEPS: SectionSpacing[] = ['none', 'xs', 'sm', 'md', 'lg', 'xl'];

/**
 * One step of the scale, with its real padding drawn and measured.
 *
 * `Section` paints its own surface from `data-theme`, so a tint on it — or on a wrapper around it —
 * is covered by that surface. The padding is therefore drawn as two overlay bands positioned from
 * the measured values, which paint after the section. Without this the story is a hatch floating in
 * empty space with the one thing being demonstrated invisible.
 */
const SpacingRow = ({ step }: { step: SectionSpacing }) => {
  const { ref, value } = useMeasure(`[data-name="spacing-${step}"]`, (element) => {
    const cs = getComputedStyle(element);
    return { top: cs.paddingTop, bottom: cs.paddingBottom };
  });

  return (
    <div ref={ref}>
      <Row label={`spacing="${step}"`} meta={value ? `${value.top} top · ${value.bottom} bottom` : undefined}>
        <div style={{ position: 'relative' }}>
          <Section name={`spacing-${step}`} spacing={step} theme="light">
            <Content>content</Content>
          </Section>
          {value ? (
            <>
              <div style={{ ...bandStyle, position: 'absolute', insetInline: 0, top: 0, height: value.top }} />
              <div style={{ ...bandStyle, position: 'absolute', insetInline: 0, bottom: 0, height: value.bottom }} />
            </>
          ) : null}
        </div>
      </Row>
    </div>
  );
};

/**
 * The whole spacing scale, measured rather than described.
 *
 * Every number is read off the DOM at the current viewport and re-read on resize. The spacing tokens
 * are `clamp()` expressions, so dragging the canvas moves every value continuously rather than
 * stepping at a breakpoint — that continuity is the thing to watch for here. A hand-written table
 * would report the value the author intended; this reports the value the browser applied, which is
 * the difference that catches a typo'd token rendering silently as `0px`.
 */
export const SpacingScale: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div>
      {STEPS.map((step) => (
        <SpacingRow key={step} step={step} />
      ))}
    </div>
  )
};
