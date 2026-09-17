import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { bandStyle, Content, frameStyle, Row, useMeasure } from '@/tools/storybook/measure';

import type { ContainerWidth } from '.';
import Container from '.';

const meta = {
  title: 'Foundations/Container',
  component: Container,
  tags: ['autodocs']
} satisfies Meta<typeof Container>;

export default meta;

type Story = StoryObj<typeof meta>;

const child = (
  <div style={{ padding: '24px', background: 'var(--bg-accent)', textAlign: 'center' }}>Container content</div>
);

export const Default: Story = { args: { children: child } };
export const Small: Story = { args: { width: 'sm', children: child } };
export const Medium: Story = { args: { width: 'md', children: child } };
export const Large: Story = { args: { width: 'lg', children: child } };

const WIDTHS: ContainerWidth[] = ['xs', 'sm', 'md', 'lg', 'xl', 'full'];

/**
 * One width, reporting three numbers.
 *
 * The token alone is misleading: at a 1280px viewport `lg`, `xl` and `full` all render identically,
 * because the viewport is narrower than their caps. Printing the token, the width actually rendered
 * and the gutter says that out loud, which is more useful than four boxes that look the same and do
 * not explain why.
 *
 * `Container` accepts a `style` prop, so its own box is outlined directly and the gutter is the
 * tinted band between that outline and the hatched content inside it.
 */
const WidthRow = ({ width }: { width: ContainerWidth }) => {
  const { ref, value } = useMeasure(`.measure-${width}`, (element) => {
    const cs = getComputedStyle(element);
    return {
      maxWidth: cs.maxWidth,
      rendered: `${Math.round(element.getBoundingClientRect().width)}px`,
      gutter: cs.paddingLeft
    };
  });

  return (
    <div ref={ref}>
      <Row
        label={`width="${width}"`}
        meta={value ? `max-width ${value.maxWidth} · rendered ${value.rendered} · gutter ${value.gutter}` : undefined}
      >
        <Container width={width} className={`measure-${width}`} style={{ ...frameStyle, position: 'relative' }}>
          {value ? (
            <>
              <div style={{ ...bandStyle, position: 'absolute', insetBlock: 0, left: 0, width: value.gutter }} />
              <div style={{ ...bandStyle, position: 'absolute', insetBlock: 0, right: 0, width: value.gutter }} />
            </>
          ) : null}
          <Content>content</Content>
        </Container>
      </Row>
    </div>
  );
};

/**
 * Every width, measured rather than described.
 *
 * Re-measured on resize, so dragging the canvas shows the caps taking effect one by one as the
 * viewport passes each one.
 */
export const WidthScale: Story = {
  // `render` ignores args, but `children` is required on ContainerProps and this meta declares no
  // default args — `satisfies Meta<typeof Container>` makes that a type error rather than a runtime
  // surprise, so the requirement is satisfied explicitly.
  args: { children: null },
  parameters: { controls: { disable: true } },
  render: () => (
    <div>
      {WIDTHS.map((width) => (
        <WidthRow key={width} width={width} />
      ))}
    </div>
  )
};
