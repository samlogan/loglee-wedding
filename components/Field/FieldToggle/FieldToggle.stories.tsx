import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import Form from '@/components/Form';

import FieldToggle from '.';

/**
 * The RSVP form's plus-one question — an addition to the comp, so there is no frame to bind.
 * Mounted inside a real `Form` for the reason every `Field` story is.
 */
const meta = {
  title: 'Forms/Field Toggle',
  component: FieldToggle,
  tags: ['autodocs'],
  args: {
    checkedText: 'Yes',
    label: 'Bringing a plus one?',
    name: 'bringing',
    uncheckedText: 'No'
  },
  decorators: [
    (Story, context) => (
      <div style={{ padding: 'var(--spacing-lg)' }}>
        <Form defaultValues={context.parameters.formDefaults ?? {}} layout="normal" submitButton={{ hide: true }}>
          <Story />
        </Form>
      </div>
    )
  ]
} satisfies Meta<typeof FieldToggle>;

export default meta;

type Story = StoryObj<typeof meta>;

const toggle = (canvasElement: HTMLElement) =>
  within(canvasElement).getByRole('switch', { name: /bringing a plus one/i });

/**
 * Off. A switch, named by the field's label alone — the painted "No" is `aria-hidden`, because the
 * switch already says "off".
 */
export const Off: Story = {
  parameters: { formDefaults: { bringing: false } },
  play: async ({ canvasElement }) => {
    await expect(toggle(canvasElement)).not.toBeChecked();
    await expect(toggle(canvasElement)).toHaveAccessibleName('Bringing a plus one?');
    await expect(within(canvasElement).getByText('No')).toBeVisible();
    await expect(within(canvasElement).getByText('Yes')).not.toBeVisible();
  }
};

export const On: Story = {
  parameters: { formDefaults: { bringing: true } },
  play: async ({ canvasElement }) => {
    await expect(toggle(canvasElement)).toBeChecked();
    await expect(within(canvasElement).getByText('Yes')).toBeVisible();
  }
};

/** Reachable and operable without a pointer — which the `display: none` version it replaced was not. */
export const KeyboardOperation: Story = {
  parameters: { formDefaults: { bringing: false } },
  play: async ({ canvasElement }) => {
    const control = toggle(canvasElement);

    await userEvent.tab();
    await expect(control).toHaveFocus();
    await waitFor(async () => {
      const track = control.nextElementSibling as HTMLElement;
      await expect(getComputedStyle(track).outlineStyle).toBe('solid');
    });

    await userEvent.keyboard('[Space]');
    await expect(control).toBeChecked();
    await userEvent.keyboard('[Space]');
    await expect(control).not.toBeChecked();
  }
};
