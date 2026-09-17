import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';

import Form from '@/components/Form';

import FieldCheckbox from '.';

/**
 * The RSVP comp's "02 · ATTENDING" question, verbatim (Figma node 1:798).
 *
 * Sentence case rather than the comp's capitals: the uppercasing is `text-transform` in the
 * stylesheet, and baking it into the content instead would put the shouting in the accessible name.
 */
const OPTIONS = [
  { value: 'fri', label: 'Arrival dinner', eyebrow: 'Fri 12 Feb' },
  { value: 'sat', label: 'The wedding', eyebrow: 'Sat 13 Feb' },
  { value: 'sun', label: 'Recovery breakfast', eyebrow: 'Sun 14 Feb' }
];

/**
 * Every story mounts its own `Form`.
 *
 * Not decoration: `FieldCommon/Field` and `useFieldError` both call `useFormContext()` and
 * destructure the result, which is `null` outside a `FormProvider` — a bare `<FieldCheckbox />`
 * throws before it renders. Wrapping also means these stories exercise the real react-hook-form
 * wiring rather than a stand-in, so "three checkboxes under one name collect into a `string[]`" is
 * actually being tested.
 *
 * `parameters.formDefaults` is how a story picks its starting selection. `useForm` reads
 * `defaultValues` once on mount, and each story mounts a fresh `Form`, so there is nothing to reset.
 */
const meta = {
  title: 'Forms/Field Checkbox',
  component: FieldCheckbox,
  tags: ['autodocs'],
  parameters: {
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/KxvsJuCNaG4n2QVp3iD4jd/Wedding?node-id=1-798'
    }
  },
  args: {
    label: '02 · Attending',
    name: 'attending',
    options: OPTIONS
  },
  decorators: [
    (Story, context) => (
      /*
       * The RSVP form column, 696px wide (Figma node 1:791), plus a gutter.
       *
       * Not decoration either: the options are a grid of `auto-fit` tracks, so their width is
       * whatever the container gives them. Left to the bare canvas at 1440px they stretch to ~470px
       * each and nothing here matches the design. 46.5rem is 696px of content inside 24px of
       * padding, which lands the three cards on the comp's 224px. The gutter also stops the focus
       * ring being clipped by the viewport edge.
       */
      <div style={{ maxWidth: '46.5rem', padding: 'var(--spacing-lg)' }}>
        <Form defaultValues={context.parameters.formDefaults ?? {}} layout="normal" submitButton={{ hide: true }}>
          <Story />
        </Form>
      </div>
    )
  ]
} satisfies Meta<typeof FieldCheckbox>;

export default meta;

type Story = StoryObj<typeof meta>;

const boxes = (canvasElement: HTMLElement) => {
  const group = within(canvasElement).getByRole('group', { name: /attending/i });
  return within(group).getAllByRole('checkbox');
};

/** The card is the input's next sibling — the painted box, and where every state style lands. */
const cardOf = (box: HTMLElement) => box.nextElementSibling as HTMLElement;

/** Nothing selected — the state the comp does not draw, inferred from the `Chip` design-system pair. */
export const Default: Story = {
  parameters: { formDefaults: {} },
  play: async ({ canvasElement }) => {
    const [fri, sat, sun] = boxes(canvasElement);

    await expect(fri).not.toBeChecked();
    await expect(sat).not.toBeChecked();
    await expect(sun).not.toBeChecked();

    /*
     * The eyebrow is in the name and the indicator is not.
     *
     * Both halves matter. "Arrival dinner" alone does not say which day is being agreed to, and the
     * indicator's "Out"/"In" would be the checkbox's own state spoken a second time — and both words
     * are in the DOM at once, so an unhidden indicator would announce "Out In" on every option.
     */
    await expect(fri).toHaveAccessibleName(/^fri 12 feb\s+arrival dinner$/i);
  }
};

/** One of three — the state that proves the options are independent rather than a radio group. */
export const PartiallySelected: Story = {
  parameters: { formDefaults: { attending: ['sat'] } },
  play: async ({ canvasElement }) => {
    const [fri, sat, sun] = boxes(canvasElement);

    await expect(fri).not.toBeChecked();
    await expect(sat).toBeChecked();
    await expect(sun).not.toBeChecked();
  }
};

/** All three — the state the comp is drawn in. */
export const AllSelected: Story = {
  parameters: { formDefaults: { attending: ['fri', 'sat', 'sun'] } },
  play: async ({ canvasElement }) => {
    for (const box of boxes(canvasElement)) {
      await expect(box).toBeChecked();
    }
  }
};

/**
 * The keyboard contract, asserted rather than assumed.
 *
 * This is the reason the input here is `opacity: 0` instead of the `display: none` both sibling
 * field types use: hidden that way it is not in the tab order at all, and neither `FieldRadio` nor
 * `FieldToggle` can be operated without a pointer today.
 */
export const KeyboardOperation: Story = {
  parameters: { formDefaults: {} },
  play: async ({ canvasElement, step }) => {
    const [fri, sat] = boxes(canvasElement);

    await step('Tab reaches the first option and rings it', async () => {
      await userEvent.tab();
      await expect(fri).toHaveFocus();
      await expect(fri.matches(':focus-visible')).toBe(true);

      /*
       * Measured on the card, because that is where the ring is drawn — the input it belongs to is
       * `opacity: 0`, and a ring around an invisible box is an invisible ring. Reading the computed
       * outline is the only way to catch a token that resolved to nothing: an undefined `var()` with
       * no fallback invalidates the whole declaration and silently removes the ring, which is
       * exactly how the site-wide one in `_reset.scss` disappeared.
       */
      const ring = getComputedStyle(fri.nextElementSibling as HTMLElement);
      await expect(ring.outlineStyle).toBe('solid');
      await expect(Number.parseFloat(ring.outlineWidth)).toBeGreaterThan(0);
    });

    await step('Space selects it, and the state is on the control itself', async () => {
      await userEvent.keyboard('[Space]');
      await expect(fri).toBeChecked();
    });

    await step('Tab moves on, and selecting the next leaves the first alone', async () => {
      await userEvent.tab();
      await expect(sat).toHaveFocus();
      await userEvent.keyboard('[Space]');
      await expect(sat).toBeChecked();
      await expect(fri).toBeChecked();
    });

    await step('Space again deselects, without disturbing the other', async () => {
      await userEvent.keyboard('[Space]');
      await expect(sat).not.toBeChecked();
      await expect(fri).toBeChecked();
    });
  }
};

/**
 * A column too narrow to seat two cards — a phone, or a sidebar on a desktop — where the comp lays
 * the card out along its length instead of stacking it (Figma node 1:892).
 *
 * The narrow wrapper is the whole point, and it is a width rather than a viewport on purpose. The
 * card's direction is a container query on the options grid, because its width is its grid track's
 * and never the window's; a story that reached this branch by shrinking the viewport would pass just
 * as well against the viewport media query this replaced, which got the middle of the range
 * backwards — three 224px cards laid out lengthwise at a 768px window. Keying the story to the
 * container is what makes it a test of the rule rather than of one screen size.
 */
export const NarrowColumn: Story = {
  parameters: { formDefaults: { attending: ['sat'] } },
  decorators: [
    (Story) => (
      <div style={{ width: '20.4375rem' }}>
        <Story />
      </div>
    )
  ],
  play: async ({ canvasElement }) => {
    for (const box of boxes(canvasElement)) {
      await expect(getComputedStyle(cardOf(box)).flexDirection).toBe('row');
    }
  }
};

/**
 * Invalid — and the reason this is a story rather than a note.
 *
 * `.card.error` is two classes, and it sits below both `.input:disabled + .card` and
 * `.input:checked:not(:disabled):hover + .card` in the cascade; each of those also sets
 * `border-color`, so the red border used to vanish on a disabled invalid field and under the pointer
 * on a selected one. Nothing caught it because nothing rendered the state. The border ink is now
 * routed through a custom property so the low-specificity rule still wins, and this asserts the
 * result the way a reader sees it: on a valid card the border matches the label, and on this one it
 * does not.
 */
export const Invalid: Story = {
  args: { required: true, errors: { attending: { message: 'Pick at least one.', type: 'required' } } },
  parameters: { formDefaults: {} },
  play: async ({ canvasElement }) => {
    const [fri] = boxes(canvasElement);

    await expect(fri).toHaveAttribute('aria-invalid', 'true');

    const card = getComputedStyle(cardOf(fri));
    await expect(card.borderTopColor).not.toBe(card.color);
  }
};

/** The asterisk goes on the `<legend>`, since `FieldLabel` — which usually draws it — is suppressed here. */
export const Required: Story = {
  args: { required: true },
  parameters: { formDefaults: {} },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('group', { name: /attending\s*\*/i })).toBeInTheDocument();
  }
};

/** Disabled takes the options out of the tab order as well as dimming them. */
export const Disabled: Story = {
  args: { disabled: true },
  parameters: { formDefaults: { attending: ['sat'] } },
  play: async ({ canvasElement }) => {
    const [fri, sat] = boxes(canvasElement);

    await expect(fri).toBeDisabled();
    await expect(sat).toBeDisabled();
    // Still reports its state — disabled is not hidden.
    await expect(sat).toBeChecked();

    await userEvent.tab();
    await expect(fri).not.toHaveFocus();
  }
};
