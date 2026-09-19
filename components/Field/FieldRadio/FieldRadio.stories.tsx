import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import Form from '@/components/Form';

import FieldRadio from '.';

/** The RSVP comp's room preference (Figma node 1:832), in the order it draws them. */
const OPTIONS = ['King Room', 'Twin Double', 'Family Room', 'No preference'].map((room) => ({
  label: room,
  value: room
}));

/**
 * Every story mounts its own `Form`, for the reason `FieldCheckbox`'s stories give: `Field` reads the
 * react-hook-form context and cannot render outside one, and wrapping means the real registration is
 * what is under test. `parameters.formDefaults` picks the starting selection.
 */
const meta = {
  title: 'Forms/Field Radio',
  component: FieldRadio,
  tags: ['autodocs'],
  parameters: {
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/KxvsJuCNaG4n2QVp3iD4jd/Wedding?node-id=1-832'
    }
  },
  args: {
    label: 'Room preference',
    name: 'roomPreference',
    options: OPTIONS,
    variant: 'pill'
  },
  decorators: [
    (Story, context) => (
      <div style={{ maxWidth: '46.5rem', padding: 'var(--spacing-lg)' }}>
        <Form defaultValues={context.parameters.formDefaults ?? {}} layout="normal" submitButton={{ hide: true }}>
          <Story />
        </Form>
      </div>
    )
  ]
} satisfies Meta<typeof FieldRadio>;

export default meta;

type Story = StoryObj<typeof meta>;

const radios = (canvasElement: HTMLElement) =>
  within(within(canvasElement).getByRole('group', { name: /room preference/i })).getAllByRole('radio');

/** The painted pill is the input's next sibling, where every state style lands. */
const pillOf = (radio: HTMLElement) => radio.nextElementSibling as HTMLElement;

/** The `Chip` pair, nothing picked — a real fieldset, named by its legend. */
export const Pill: Story = {
  parameters: { formDefaults: {} },
  play: async ({ canvasElement }) => {
    const group = within(canvasElement).getByRole('group', { name: /room preference/i });
    await expect(group.tagName).toBe('FIELDSET');
    await expect(group.querySelector(':scope > legend')).not.toBeNull();

    for (const radio of radios(canvasElement)) {
      await expect(radio).not.toBeChecked();
    }
    // Ids are unique per option, not the value — "King Room" has a space and is not a valid id.
    await expect(radios(canvasElement).map((radio) => radio.id)).toEqual([
      'roomPreference-0',
      'roomPreference-1',
      'roomPreference-2',
      'roomPreference-3'
    ]);
  }
};

/** One picked — `Chip · selected`, the state the comp draws on "King Room". */
export const PillSelected: Story = {
  parameters: { formDefaults: { roomPreference: 'King Room' } },
  play: async ({ canvasElement }) => {
    const [king, twin] = radios(canvasElement);
    await expect(king).toBeChecked();
    await expect(twin).not.toBeChecked();

    // Filled against hollow, measured rather than assumed. Polled for the theme — see `FieldCheckbox`.
    await waitFor(async () => {
      await expect(getComputedStyle(pillOf(king)).backgroundColor).not.toBe(
        getComputedStyle(pillOf(twin)).backgroundColor
      );
    });
  }
};

/**
 * The keyboard contract the old version could not meet at all — its inputs were `display: none`.
 * Tab reaches the group, Space picks, an arrow moves the choice, and the ring is drawn on the pill.
 */
export const KeyboardOperation: Story = {
  parameters: { formDefaults: {} },
  play: async ({ canvasElement }) => {
    const [king, twin] = radios(canvasElement);

    await userEvent.tab();
    await expect(king).toHaveFocus();
    await waitFor(async () => {
      await expect(getComputedStyle(pillOf(king)).outlineStyle).toBe('solid');
    });

    await userEvent.keyboard('[Space]');
    await expect(king).toBeChecked();

    await userEvent.keyboard('{ArrowRight}');
    await expect(twin).toHaveFocus();
    await expect(twin).toBeChecked();
    await expect(king).not.toBeChecked();
  }
};

/** Invalid: every option is `aria-invalid` and described by the message, which is in words. */
export const Invalid: Story = {
  args: { errors: { roomPreference: { message: 'Pick a room, or "No preference".', type: 'validate' } } },
  parameters: { formDefaults: {} },
  play: async ({ canvasElement }) => {
    for (const radio of radios(canvasElement)) {
      await expect(radio).toHaveAttribute('aria-invalid', 'true');
      await expect(radio).toHaveAccessibleDescription('Pick a room, or "No preference".');
    }
  }
};

/** The plain variant — a dot beside each label, with the same fieldset, legend and keyboard contract. */
export const Default: Story = {
  args: { variant: 'default' },
  parameters: { formDefaults: { roomPreference: 'Twin Double' } },
  play: async ({ canvasElement }) => {
    const [, twin] = radios(canvasElement);
    await expect(twin).toBeChecked();
    await expect(within(canvasElement).getByRole('group', { name: /room preference/i }).tagName).toBe('FIELDSET');
  }
};
