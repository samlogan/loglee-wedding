import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';

import Form from '@/components/Form';

import FieldNumber from '.';

/**
 * The RSVP comp's kids stepper (Figma node 1:849), at its 200px column width. Mounted inside a real
 * `Form` for the reason every `Field` story is.
 */
const meta = {
  title: 'Forms/Field Number',
  component: FieldNumber,
  tags: ['autodocs'],
  parameters: {
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/KxvsJuCNaG4n2QVp3iD4jd/Wedding?node-id=1-849'
    }
  },
  args: {
    decrementLabel: 'Remove a child',
    incrementLabel: 'Add a child',
    label: 'Kids',
    max: 3,
    min: 0,
    name: 'kidsCount'
  },
  decorators: [
    (Story, context) => (
      <div style={{ padding: 'var(--spacing-lg)', width: '12.5rem' }}>
        <Form
          defaultValues={context.parameters.formDefaults ?? { kidsCount: 0 }}
          layout="normal"
          submitButton={{ hide: true }}
        >
          <Story />
        </Form>
      </div>
    )
  ]
} satisfies Meta<typeof FieldNumber>;

export default meta;

type Story = StoryObj<typeof meta>;

const spin = (canvasElement: HTMLElement) => within(canvasElement).getByRole('spinbutton', { name: /^kids/i });
const button = (canvasElement: HTMLElement, name: string) => within(canvasElement).getByRole('button', { name });

/**
 * At the floor. The input is named by the label — which the controlled field could not do before,
 * having no `id` for the `<label>` to point at — and "Remove a child" says it can go no lower.
 */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(spin(canvasElement)).toHaveValue(0);
    await expect(button(canvasElement, 'Remove a child')).toHaveAttribute('aria-disabled', 'true');
    await expect(button(canvasElement, 'Add a child')).not.toHaveAttribute('aria-disabled');
  }
};

/** Up to the ceiling and no further; the value is announced as it changes. */
export const Stepping: Story = {
  play: async ({ canvasElement }) => {
    const add = button(canvasElement, 'Add a child');
    for (let press = 0; press < 5; press++) {
      await userEvent.click(add);
    }
    await expect(spin(canvasElement)).toHaveValue(3);
    await expect(add).toHaveAttribute('aria-disabled', 'true');
    // Scoped to the stepper: the form's honeypot and every field's error region are polite too.
    await expect(spin(canvasElement).parentElement?.querySelector('[aria-live="polite"]')).toHaveTextContent('3');

    await userEvent.click(button(canvasElement, 'Remove a child'));
    await expect(spin(canvasElement)).toHaveValue(2);
  }
};

/**
 * The reason the limit is `aria-disabled` rather than `disabled`: pressing the button that reaches it
 * must not throw focus out of the form.
 */
export const FocusStaysAtTheLimit: Story = {
  parameters: { formDefaults: { kidsCount: 1 } },
  play: async ({ canvasElement }) => {
    const remove = button(canvasElement, 'Remove a child');

    await userEvent.tab();
    await expect(remove).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(spin(canvasElement)).toHaveValue(0);
    await expect(remove).toHaveFocus();

    await userEvent.keyboard('{Enter}');
    await expect(spin(canvasElement)).toHaveValue(0);
  }
};

/** A typed value outside the range is pulled back into it when the field is left. */
export const ClampsTypedValues: Story = {
  play: async ({ canvasElement }) => {
    const input = spin(canvasElement);
    await userEvent.clear(input);
    await userEvent.type(input, '12');
    await userEvent.tab();
    await expect(input).toHaveValue(3);
  }
};
