import type { Decorator, Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import type { Mock } from 'storybook/test';

import RsvpForm from '.';
import type { RsvpAction, RsvpFormState } from './contract';

/**
 * The copy every story asserts against — explicit here, never read back from the component's own
 * defaults, so a story fails if the props stop reaching the page rather than agreeing with itself.
 */
const COPY = {
  heading: 'RSVP',
  intro: 'One form per guest.',
  introDetail:
    "Tell us which days you'll join, what you eat, where you'd like to sleep and what you'd like to hear on the dancefloor."
};

/** What the stub in `app/(frontend)/rsvp/actions.ts` says, restated so no story imports the server. */
const NOT_OPEN_YET =
  "We're not taking RSVPs through the site just yet, so your reply hasn't been saved. Please try again soon.";

/**
 * A mock action that resolves to `result`. Every story gets its own, so call counts never leak
 * between them, and none of them is the real server action.
 */
const actionReturning = (result: RsvpFormState) => fn(async (): Promise<RsvpFormState> => result);

/**
 * How long to wait for the action's result to render. The mock resolves at once and the result
 * commits in well under testing-library's 1000ms default on its own; this is headroom for a full
 * `yarn test`, where every story file shares the machine. A result that never arrives still fails —
 * see `Sending` for the way one did.
 */
const ROUND_TRIP = { timeout: 5000 };

/** The recorded calls, typed as the action they stand in for — `[previousState, formData]`. */
const callsOf = (action: RsvpAction) => (action as unknown as Mock<RsvpAction>).mock.calls;

/**
 * A fixed width, in `px`, because the component's one switch is `px` — it hides the summary, so it
 * must not move with the root font size, and a `rem` wrapper would reintroduce exactly that
 * dependency here (see the same note in `MediaTagsSection`'s stories). The padding keeps focus rings
 * off the canvas edge.
 *
 * 1200px is the desktop frame's content width (1280 less its 40px gutters); 350px the phone frame's.
 *
 * The top padding is the rail's sticky offset. On the page the rail starts below the header and the
 * section's own spacing, clear of that offset; with nothing above it here, `position: sticky` would
 * push it down to the offset at rest and the rail would sit lower than the questions it heads.
 */
const atWidth =
  (width: string): Decorator =>
  (Story) => (
    <div style={{ padding: 'var(--spacing-3xl) var(--spacing-lg) var(--spacing-lg)' }}>
      <div style={{ width }}>
        <Story />
      </div>
    </div>
  );

const atDesktop = atWidth('1200px');
const atMobile = atWidth('350px');

const meta = {
  title: 'Forms/RSVP Form',
  component: RsvpForm,
  tags: ['autodocs'],
  parameters: {
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/KxvsJuCNaG4n2QVp3iD4jd/Wedding?node-id=1-752'
    }
  },
  args: {
    ...COPY,
    action: actionReturning({ status: 'success' })
  },
  decorators: [atDesktop]
} satisfies Meta<typeof RsvpForm>;

export default meta;

type Story = StoryObj<typeof meta>;

// ---------------------------------------------------------------------------
// Queries, named once

const nameInput = (canvas: ReturnType<typeof within>) => canvas.getByRole('textbox', { name: /^name/i });
const emailInput = (canvas: ReturnType<typeof within>) => canvas.getByRole('textbox', { name: /^email/i });
const dayBoxes = (canvas: ReturnType<typeof within>) =>
  within(canvas.getByRole('group', { name: /^attending/i })).getAllByRole('checkbox');
const plusOneSwitch = (canvas: ReturnType<typeof within>) =>
  canvas.getByRole('switch', { name: /bringing a plus one/i });
const submitButton = (canvas: ReturnType<typeof within>) => canvas.getByRole('button', { name: /send rsvp|saved/i });

/** The summary panel's value for one row — `Fri` → `In`. */
const summaryValue = (canvasElement: HTMLElement, term: string) => {
  const summary = within(canvasElement).getByRole('region', { name: /your reply/i });
  const dt = within(summary).getByText(term, { selector: 'dt' });
  return dt.nextElementSibling?.textContent;
};

/**
 * The element that describes a control, which must also be a live region — that is what makes the
 * message *spoken* as it appears, rather than only there to be found. See the note in `index.tsx`.
 */
const describerOf = (control: HTMLElement) =>
  // An attribute selector rather than `#id`, which a dotted name like `plusOne.name-error` would break.
  document.querySelector(`[id="${control.getAttribute('aria-describedby')}"]`) as HTMLElement;

const fillRequired = async (canvas: ReturnType<typeof within>) => {
  await userEvent.type(nameInput(canvas), 'Ada Lovelace');
  await userEvent.type(emailInput(canvas), 'ada@example.com');
};

// ---------------------------------------------------------------------------
// Stories

/**
 * The page as a guest first meets it — nothing answered, nothing sent.
 *
 * Asserts the three things the ticket fixes about its structure: the game layer is gone, the
 * numbering is derived from position (01–08 with email and the plus one inserted, not the comp's
 * 01–06), and the two groups are real fieldsets named by their legends.
 */
export const Empty: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('heading', { level: 1, name: COPY.heading })).toBeInTheDocument();
    await expect(canvas.getByText(COPY.intro, { exact: false })).toBeInTheDocument();

    // No game-layer copy anywhere — the comp's "PLAYER NAME", "LOADOUT", "PRESS START" and its ▸.
    await expect(canvasElement.textContent).not.toMatch(/player|loadout|press start|[▶▸]/i);

    // The ordinals, in document order, are 01–08 and hidden from assistive technology.
    const ordinals = [...canvasElement.querySelectorAll('span[aria-hidden="true"]')]
      .map((span) => span.textContent ?? '')
      .filter((text) => /^\d{2} · $/.test(text));
    await expect(ordinals).toEqual(['01 · ', '02 · ', '03 · ', '04 · ', '05 · ', '06 · ', '07 · ', '08 · ']);
    await expect(nameInput(canvas)).toHaveAccessibleName(/^name/i);

    for (const name of [/^attending/i, /^room preference/i]) {
      const group = canvas.getByRole('group', { name });
      await expect(group.tagName).toBe('FIELDSET');
      await expect(group.querySelector(':scope > legend')).not.toBeNull();
    }

    await expect(summaryValue(canvasElement, 'Fri')).toBe('Out');
    await expect(summaryValue(canvasElement, 'Kids')).toBe('0');
    await expect(submitButton(canvas)).toHaveAccessibleName('Send RSVP');
  }
};

/**
 * Desktop, with the rail's summary following the answers as they change — the reason the heading
 * and the form are one component rather than two sections.
 */
export const LiveSummary: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [fri, , sun] = dayBoxes(canvas);

    // The rail is sticky on this layout. Measured on the element, not assumed from the stylesheet.
    const rail = canvas.getByRole('heading', { level: 1 }).parentElement as HTMLElement;
    await expect(getComputedStyle(rail).position).toBe('sticky');

    await userEvent.click(fri);
    await userEvent.click(sun);
    await expect(summaryValue(canvasElement, 'Fri')).toBe('In');
    await expect(summaryValue(canvasElement, 'Sat')).toBe('Out');
    await expect(summaryValue(canvasElement, 'Sun')).toBe('In');

    await userEvent.click(canvas.getByRole('button', { name: 'Add a child' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Add a child' }));
    await expect(summaryValue(canvasElement, 'Kids')).toBe('2');

    await userEvent.click(fri);
    await expect(summaryValue(canvasElement, 'Fri')).toBe('Out');
  }
};

/**
 * Every question answered, and the contract asserted from the receiving end: the `FormData` the
 * action gets carries the schema's names, and the values the comp's controls produce.
 */
export const Filled: Story = {
  args: { action: actionReturning({ status: 'success' }) },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await fillRequired(canvas);
    const [fri, , sun] = dayBoxes(canvas);
    await userEvent.click(fri);
    await userEvent.click(sun);
    await userEvent.type(canvas.getByRole('textbox', { name: /^dietary requirements/i }), 'Vegetarian');
    await userEvent.click(plusOneSwitch(canvas));
    await userEvent.type(canvas.getByRole('textbox', { name: /^plus one name/i }), 'Charles Babbage');
    await userEvent.type(canvas.getByRole('textbox', { name: /^plus one dietary/i }), 'None');
    await userEvent.click(canvas.getByRole('radio', { name: 'Family Room' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Add a child' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Add a child' }));
    await userEvent.type(canvas.getByRole('textbox', { name: /^ages/i }), '2 and 5');
    await userEvent.type(canvas.getByRole('textbox', { name: /^song request/i }), 'September');

    await userEvent.click(submitButton(canvas));

    await waitFor(() => expect(callsOf(args.action)).toHaveLength(1), ROUND_TRIP);
    const [previousState, formData] = callsOf(args.action)[0];
    await expect(previousState).toEqual({ status: 'idle' });
    await expect(formData.get('name')).toBe('Ada Lovelace');
    await expect(formData.get('email')).toBe('ada@example.com');
    await expect(formData.getAll('attending')).toEqual(['friday', 'sunday']);
    await expect(formData.get('dietary')).toBe('Vegetarian');
    await expect(formData.get('plusOne.bringing')).toBe('on');
    await expect(formData.get('plusOne.name')).toBe('Charles Babbage');
    await expect(formData.get('plusOne.dietary')).toBe('None');
    await expect(formData.get('roomPreference')).toBe('Family Room');
    await expect(formData.get('kidsCount')).toBe('2');
    await expect(formData.get('kidsAges')).toBe('2 and 5');
    await expect(formData.get('songRequest')).toBe('September');
    // The honeypot is present in the form and was left alone, so it submits nothing.
    await expect(formData.has('_gotcha')).toBe(false);
  }
};

/**
 * A reply the action stored: the button takes the design's filled "saved" state, which is the whole
 * confirmation — and gives it up the moment an answer changes, because the edit is not saved yet.
 */
export const Saved: Story = {
  args: { action: actionReturning({ status: 'success' }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await fillRequired(canvas);
    await userEvent.click(submitButton(canvas));

    const button = await canvas.findByRole('button', { name: 'Saved' }, ROUND_TRIP);
    await expect(canvas.getByRole('status')).toHaveTextContent(/your reply is in/i);
    // Not colour alone: the label changes to a word, with a tick beside it.
    await expect(button).toHaveTextContent('✓Saved');
    await expect(button).not.toBeDisabled();

    await userEvent.type(canvas.getByRole('textbox', { name: /^song request/i }), 'September');
    await expect(canvas.getByRole('button', { name: 'Send RSVP' })).toBeInTheDocument();
    await expect(canvas.getByRole('status')).toBeEmptyDOMElement();
  }
};

/**
 * The action for `Sending`, held open until the play function lets it go.
 *
 * It must be let go, and in a `finally`. React 19 entangles every async transition that starts while
 * another is still pending, so an action left unresolved here stalls every later story's action on
 * the same page — measured under Vitest, which runs a file's stories in one document: the three
 * stories after this one waited on a result that could never commit. The Storybook UI hides it,
 * because it loads each story fresh.
 */
const inFlight: { release?: () => void } = {};
const heldAction = fn(() => {
  const { promise, resolve } = Promise.withResolvers<RsvpFormState>();
  inFlight.release = () => resolve({ status: 'success' });
  return promise;
});

/** While the action is in flight. The button stays enabled so focus is never dropped from it. */
export const Sending: Story = {
  args: { action: heldAction },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    try {
      await fillRequired(canvas);
      await userEvent.click(submitButton(canvas));

      await expect(await canvas.findByRole('button', { name: 'Sending…' }, ROUND_TRIP)).not.toBeDisabled();
      await expect(canvas.getByRole('status')).toHaveTextContent('Sending your reply…');
    } finally {
      inFlight.release?.();
    }

    // And once it lands, the pending state gives way to the saved one.
    await expect(await canvas.findByRole('button', { name: 'Saved' }, ROUND_TRIP)).toBeInTheDocument();
  }
};

/**
 * Submitted empty. Client validation stops it before the action is called, marks both required
 * fields invalid in words as well as colour, and moves focus to the first.
 */
export const ClientErrors: Story = {
  args: { action: actionReturning({ status: 'success' }) },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(submitButton(canvas));

    const name = nameInput(canvas);
    await waitFor(() => expect(name).toHaveAttribute('aria-invalid', 'true'));
    await expect(name).toHaveAccessibleDescription('This field is required');
    await expect(describerOf(name)).toHaveAttribute('role', 'alert');
    await expect(emailInput(canvas)).toHaveAttribute('aria-invalid', 'true');
    await expect(name).toHaveFocus();
    await expect(callsOf(args.action)).toHaveLength(0);

    // The email rule, past the required one.
    await userEvent.type(emailInput(canvas), 'not-an-email');
    await userEvent.click(submitButton(canvas));
    await waitFor(() =>
      expect(emailInput(canvas)).toHaveAccessibleDescription('Enter an email address, like name@example.com')
    );
  }
};

/**
 * The action rejected two answers and said why. Its errors land on the fields they are keyed to —
 * `aria-invalid`, and described by the message — focus moves to the first, and the form-level alert
 * says the reply was not sent.
 */
export const ServerErrors: Story = {
  args: {
    action: actionReturning({
      fieldErrors: {
        email: 'That email is already on the guest list with another reply.',
        kidsAges: 'Give an age for each child.'
      },
      message: 'Two answers need another look.',
      status: 'error'
    })
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await fillRequired(canvas);
    await userEvent.click(submitButton(canvas));

    const email = emailInput(canvas);
    await waitFor(() => expect(email).toHaveAttribute('aria-invalid', 'true'), ROUND_TRIP);
    await expect(email).toHaveAccessibleDescription('That email is already on the guest list with another reply.');
    // Spoken, not only linked: the describing element is a live region.
    await expect(describerOf(email)).toHaveAttribute('role', 'alert');
    await waitFor(() => expect(email).toHaveFocus(), ROUND_TRIP);

    const ages = canvas.getByRole('textbox', { name: /^ages/i });
    await expect(ages).toHaveAttribute('aria-invalid', 'true');
    await expect(ages).toHaveAccessibleDescription('Give an age for each child.');

    const alerts = canvas.getAllByRole('alert').map((alert) => alert.textContent);
    await expect(alerts).toContain('Two answers need another look. Check the 2 answers marked above.');
    await expect(canvas.getByRole('button', { name: 'Send RSVP' })).toBeInTheDocument();

    // A server error clears the way a client one does — when the field next validates.
    await userEvent.clear(email);
    await userEvent.type(email, 'ada.lovelace@example.com');
    await waitFor(() => expect(email).not.toHaveAttribute('aria-invalid'));
  }
};

/**
 * What the stub action answers until MAM-1903 lands: nothing stored, a form-level message, no field
 * at fault. The button must never claim a save.
 */
export const NotAcceptingYet: Story = {
  args: { action: actionReturning({ fieldErrors: {}, message: NOT_OPEN_YET, status: 'error' }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await fillRequired(canvas);
    await userEvent.click(submitButton(canvas));

    await waitFor(
      () => expect(canvas.getAllByRole('alert').map((alert) => alert.textContent)).toContain(NOT_OPEN_YET),
      ROUND_TRIP
    );
    await expect(canvas.queryByRole('button', { name: 'Saved' })).toBeNull();
    await expect(canvasElement.querySelector('[aria-invalid="true"]')).toBeNull();
  }
};

/**
 * The plus-one fields appear with the switch — and clear when it goes off, rather than only hiding.
 * A name typed, switched off and switched back on comes back empty, and is never submitted.
 */
export const PlusOne: Story = {
  args: { action: actionReturning({ status: 'success' }) },
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement);
    const toggle = plusOneSwitch(canvas);

    await step('Off: no plus-one fields', async () => {
      await expect(toggle).not.toBeChecked();
      await expect(canvas.queryByRole('textbox', { name: /^plus one name/i })).toBeNull();
    });

    await step('On: both fields appear, and the name is required', async () => {
      await userEvent.click(toggle);
      await expect(toggle).toBeChecked();
      await userEvent.type(canvas.getByRole('textbox', { name: /^plus one name/i }), 'Charles Babbage');
      await userEvent.type(canvas.getByRole('textbox', { name: /^plus one dietary/i }), 'None');
    });

    await step('Off again: gone', async () => {
      await userEvent.click(toggle);
      await expect(canvas.queryByRole('textbox', { name: /^plus one name/i })).toBeNull();
      await expect(canvas.queryByRole('textbox', { name: /^plus one dietary/i })).toBeNull();
    });

    await step('On again: cleared, not restored', async () => {
      await userEvent.click(toggle);
      await expect(canvas.getByRole('textbox', { name: /^plus one name/i })).toHaveValue('');
      await expect(canvas.getByRole('textbox', { name: /^plus one dietary/i })).toHaveValue('');
    });

    await step('Off, then sent: nothing about a plus one is submitted', async () => {
      await userEvent.type(canvas.getByRole('textbox', { name: /^plus one name/i }), 'Stale Name');
      await userEvent.click(toggle);
      await fillRequired(canvas);
      await userEvent.click(submitButton(canvas));
      await waitFor(() => expect(callsOf(args.action)).toHaveLength(1), ROUND_TRIP);
      const [, formData] = callsOf(args.action)[0];
      await expect(formData.has('plusOne.bringing')).toBe(false);
      await expect(formData.has('plusOne.name')).toBe(false);
      await expect(formData.has('plusOne.dietary')).toBe(false);
    });
  }
};

/**
 * The whole form, completed and sent from the keyboard alone — every field, the cards, the switch,
 * the pills, the stepper and the button, reached in order by Tab.
 */
export const KeyboardOnly: Story = {
  args: { action: actionReturning({ status: 'success' }) },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const [fri, sat, sun] = dayBoxes(canvas);

    await userEvent.tab();
    await expect(nameInput(canvas)).toHaveFocus();
    await userEvent.keyboard('Ada Lovelace');

    await userEvent.tab();
    await expect(emailInput(canvas)).toHaveFocus();
    await userEvent.keyboard('ada@example.com');

    await userEvent.tab();
    await expect(fri).toHaveFocus();
    await userEvent.keyboard('[Space]');
    await userEvent.tab();
    await expect(sat).toHaveFocus();
    await userEvent.keyboard('[Space]');
    await userEvent.tab();
    await expect(sun).toHaveFocus();

    await userEvent.tab();
    await expect(canvas.getByRole('textbox', { name: /^dietary requirements/i })).toHaveFocus();
    await userEvent.keyboard('Coeliac');

    await userEvent.tab();
    await expect(plusOneSwitch(canvas)).toHaveFocus();
    await userEvent.keyboard('[Space]');
    await expect(plusOneSwitch(canvas)).toBeChecked();

    await userEvent.tab();
    await expect(canvas.getByRole('textbox', { name: /^plus one name/i })).toHaveFocus();
    await userEvent.keyboard('Charles Babbage');
    await userEvent.tab();
    await expect(canvas.getByRole('textbox', { name: /^plus one dietary/i })).toHaveFocus();

    // Into the pills: Tab lands on the first, Space picks it, an arrow moves the choice.
    await userEvent.tab();
    await expect(canvas.getByRole('radio', { name: 'King Room' })).toHaveFocus();
    await userEvent.keyboard('[Space]');
    await userEvent.keyboard('{ArrowRight}');
    await expect(canvas.getByRole('radio', { name: 'Twin Double' })).toBeChecked();

    // The stepper: the floor button keeps focus (it is aria-disabled, not disabled), then + twice.
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'Remove a child' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(canvas.getByRole('button', { name: 'Remove a child' })).toHaveFocus();
    await userEvent.tab();
    await expect(canvas.getByRole('spinbutton', { name: /^kids/i })).toHaveFocus();
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'Add a child' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard('{Enter}');
    await expect(canvas.getByRole('spinbutton', { name: /^kids/i })).toHaveValue(2);

    await userEvent.tab();
    await expect(canvas.getByRole('textbox', { name: /^ages/i })).toHaveFocus();
    await userEvent.keyboard('3 and 6');
    await userEvent.tab();
    await expect(canvas.getByRole('textbox', { name: /^song request/i })).toHaveFocus();
    await userEvent.keyboard('Dancing Queen');

    await userEvent.tab();
    await expect(submitButton(canvas)).toHaveFocus();
    await userEvent.keyboard('{Enter}');

    await waitFor(() => expect(callsOf(args.action)).toHaveLength(1), ROUND_TRIP);
    const [, formData] = callsOf(args.action)[0];
    await expect(formData.getAll('attending')).toEqual(['friday', 'saturday']);
    await expect(formData.get('roomPreference')).toBe('Twin Double');
    await expect(formData.get('kidsCount')).toBe('2');
    await expect(formData.get('plusOne.name')).toBe('Charles Babbage');
    await expect(await canvas.findByRole('button', { name: 'Saved' }, ROUND_TRIP)).toHaveFocus();
  }
};

/**
 * The phone frame: one column, nothing sticky, the summary panel gone, and the kids stepper and the
 * ages input still sharing a row.
 */
export const Mobile: Story = {
  decorators: [atMobile],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const rail = canvas.getByRole('heading', { level: 1 }).parentElement as HTMLElement;
    await expect(getComputedStyle(rail).position).toBe('static');

    // `display: none`, so it is out of the accessibility tree as well as off the screen.
    await expect(canvas.queryByRole('region', { name: /your reply/i })).toBeNull();
    // The intro keeps its first sentence and loses the rest, as the phone frame draws it.
    await expect(canvas.getByText(COPY.intro, { exact: false })).toBeVisible();
    await expect(canvas.getByText(COPY.introDetail, { exact: false })).not.toBeVisible();

    const stepper = canvas.getByRole('spinbutton', { name: /^kids/i }).parentElement as HTMLElement;
    const ages = canvas.getByRole('textbox', { name: /^ages/i });
    const stepperBox = stepper.getBoundingClientRect();
    const agesBox = ages.getBoundingClientRect();
    // Two up: side by side, sharing a row — the ages rule ends within the stepper's height.
    await expect(agesBox.left).toBeGreaterThan(stepperBox.right);
    await expect(agesBox.bottom).toBeGreaterThan(stepperBox.top);
    await expect(agesBox.bottom).toBeLessThanOrEqual(stepperBox.bottom + 1);
    // And their labels share a line, as the phone frame draws them.
    const [kidsLabel, agesLabel] = ['kidsCount', 'kidsAges'].map((id) =>
      (canvasElement.querySelector(`label[for="${id}"]`) as HTMLElement).getBoundingClientRect()
    );
    await expect(Math.abs(kidsLabel.top - agesLabel.top)).toBeLessThanOrEqual(1);
    // Kept: the gloss is desktop-only, so the phone's label is the one word the comp prints.
    await expect(agesLabel.height).toBeLessThan(stepperBox.height);

    // The button runs edge to edge.
    const button = submitButton(canvas);
    const column = button.parentElement as HTMLElement;
    await expect(button.getBoundingClientRect().width).toBeCloseTo(column.getBoundingClientRect().width, 0);
  }
};
