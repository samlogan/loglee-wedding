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
  introDetail: "Tell us what you eat, who you're bringing and what you'd like to hear on the dancefloor."
};

/**
 * What `app/(frontend)/rsvp/actions.ts` says when a guest sends a changed reply seconds after their
 * last one, restated so no story imports the server.
 */
const TOO_SOON =
  "You sent a reply a moment ago, so this change hasn't been saved yet. Give it a few seconds, then send it again.";

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
 * A fixed width, in `px`, because the component's one switch is `px` — it hides the character, so it
 * must not move with the root font size, and a `rem` wrapper would reintroduce exactly that
 * dependency here (see the same note in `MediaTagsSection`'s stories). The padding keeps focus rings
 * off the canvas edge.
 *
 * 1200px is the desktop frame's content width (1280 less its 40px gutters); 350px the phone frame's.
 *
 * The top padding is the rail's sticky offset. On the page the rail starts below the header and the
 * section's own spacing, clear of that offset; with nothing above it here, `position: sticky` would
 * push it down to the offset at rest and the rail would sit lower than the questions it heads.
 *
 * One decorator that reads `parameters.canvasWidth`, not a second one on the phone story: a story's
 * decorators run *inside* the meta's, so a phone wrapper sat in the 1200px one and the canvas
 * scrolled 800px sideways at a phone viewport.
 */
const DESKTOP_WIDTH = '1200px';
const MOBILE_WIDTH = '350px';

const atWidth: Decorator = (Story, { parameters }) => (
  <div style={{ padding: 'var(--spacing-3xl) var(--spacing-lg) var(--spacing-lg)' }}>
    <div style={{ width: parameters.canvasWidth ?? DESKTOP_WIDTH }}>
      <Story />
    </div>
  </div>
);

/** The two players' models, as the page fetches them — the committed GLBs in `public/`. */
const MODELS = [
  {
    clips: { feature: 'Gangnam_Groove', hover: 'Excited_Walk_M', idle: 'Walking' },
    name: 'Sam',
    src: '/sam.glb'
  },
  { name: 'Lauren', src: '/lauren.glb' }
];

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
    action: actionReturning({ status: 'success' }),
    models: MODELS
  },
  decorators: [atWidth]
} satisfies Meta<typeof RsvpForm>;

export default meta;

type Story = StoryObj<typeof meta>;

// ---------------------------------------------------------------------------
// Queries, named once

const nameInput = (canvas: ReturnType<typeof within>) => canvas.getByRole('textbox', { name: /^name/i });
const emailInput = (canvas: ReturnType<typeof within>) => canvas.getByRole('textbox', { name: /^email/i });
const plusOneSwitch = (canvas: ReturnType<typeof within>) =>
  canvas.getByRole('switch', { name: /bringing a plus one/i });
const submitButton = (canvas: ReturnType<typeof within>) => canvas.getByRole('button', { name: /send rsvp|saved/i });

/** The character in the rail, found by the name `ModelViewer` gives whatever is in the arch. */
const railModel = (canvas: ReturnType<typeof within>) => canvas.queryByRole('img', { name: /as (a )?3D characters?/ });

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
 * numbering is derived from position (01–06 now that the days and room questions are gone), and
 * the rail holds one of the couple's 3D characters.
 */
export const Empty: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('heading', { level: 1, name: COPY.heading })).toBeInTheDocument();
    await expect(canvas.getByText(COPY.intro, { exact: false })).toBeInTheDocument();

    // No game-layer copy anywhere — the comp's "PLAYER NAME", "LOADOUT", "PRESS START" and its ▸.
    await expect(canvasElement.textContent).not.toMatch(/player|loadout|press start|[▶▸]/i);

    // The ordinals, in document order, are 01–07 and hidden from assistive technology.
    const ordinals = [...canvasElement.querySelectorAll('span[aria-hidden="true"]')]
      .map((span) => span.textContent ?? '')
      .filter((text) => /^\d{2} · $/.test(text));
    await expect(ordinals).toEqual(['01 · ', '02 · ', '03 · ', '04 · ', '05 · ', '06 · ', '07 · ']);
    await expect(nameInput(canvas)).toHaveAccessibleName(/^name/i);

    // Neither dropped question is asked any more.
    await expect(canvas.queryByRole('group', { name: /^attending/i })).toBeNull();
    await expect(canvas.queryByRole('radio')).toBeNull();

    // Present and named from first paint; drawn once the character loads, with nothing behind it until then.
    await expect(railModel(canvas)).toBeInTheDocument();
    await expect(submitButton(canvas)).toHaveAccessibleName('Send RSVP');
  }
};

/**
 * A signed-in guest, from their row in the guest sheet: name and email are filled in (and still
 * editable), and their stay and what it comes to sit above the questions. The reply-by note from
 * Wedding Settings sits under the heading.
 */
export const SignedInGuest: Story = {
  args: {
    guest: {
      email: 'sam@example.com',
      name: 'Sam Logan',
      stay: { nights: 2, perNight: 150, stay: 'King Room', total: 300 }
    },
    note: [
      {
        _key: 'note',
        _type: 'block',
        children: [{ _key: 'note-span', _type: 'span', marks: [], text: 'Please RSVP by 30 November.' }],
        markDefs: [],
        style: 'normal'
      }
    ]
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(nameInput(canvas)).toHaveValue('Sam Logan');
    await expect(emailInput(canvas)).toHaveValue('sam@example.com');

    const stay = canvas.getByRole('region', { name: /your stay/i });
    await expect(stay).toHaveTextContent('King Room · 2 nights');
    await expect(stay).toHaveTextContent('$150 per room, per night');
    await expect(stay).toHaveTextContent('$300 in total');

    await expect(canvas.getByText('Please RSVP by 30 November.')).toBeInTheDocument();
    await expect(canvas.getByRole('textbox', { name: /special requirements/i })).toBeInTheDocument();
  }
};

/** A guest whose row gives no stay: the form prefills, and shows no price at all. */
export const GuestWithoutStay: Story = {
  args: { guest: { email: 'lauren@example.com', name: 'Lauren Lee' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(nameInput(canvas)).toHaveValue('Lauren Lee');
    await expect(canvas.queryByRole('region', { name: /your stay/i })).toBeNull();
  }
};

/**
 * Desktop: the rail is sticky beside the questions, and holds one of the couple's 3D characters —
 * picked at random in the browser, so the name settles on one of the two after hydration.
 */
export const RailModel: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // The rail is sticky on this layout. Measured on the element, not assumed from the stylesheet.
    const rail = canvas.getByRole('heading', { level: 1 }).parentElement as HTMLElement;
    await expect(getComputedStyle(rail).position).toBe('sticky');

    await waitFor(() =>
      expect(railModel(canvas)).toHaveAccessibleName('Sam and Lauren, as 3D characters, walking side by side')
    );
    await expect(rail.contains(railModel(canvas))).toBe(true);
  }
};

/** No models to show — the rail is the heading and the intro alone. */
export const WithoutModel: Story = {
  args: { models: [] },
  play: async ({ canvasElement }) => {
    await expect(railModel(within(canvasElement))).toBeNull();
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
    await userEvent.type(canvas.getByRole('textbox', { name: /^dietary requirements/i }), 'Vegetarian');
    await userEvent.click(plusOneSwitch(canvas));
    await userEvent.type(canvas.getByRole('textbox', { name: /^plus one name/i }), 'Charles Babbage');
    await userEvent.type(canvas.getByRole('textbox', { name: /^plus one dietary/i }), 'None');
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
    // The two dropped questions send nothing.
    await expect(formData.has('attending')).toBe(false);
    await expect(formData.has('roomPreference')).toBe(false);
    await expect(formData.get('dietary')).toBe('Vegetarian');
    await expect(formData.get('plusOne.bringing')).toBe('on');
    await expect(formData.get('plusOne.name')).toBe('Charles Babbage');
    await expect(formData.get('plusOne.dietary')).toBe('None');
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
 * fields invalid in words as well as colour, and moves focus to the first. Then the one rule that
 * is not about a missing answer: a kids count typed past the stepper's range.
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

    // Typed past the ceiling and sent with Enter from inside the input — before the blur that would
    // settle it. Everything else is valid now, so this alone holds the reply back.
    await userEvent.type(nameInput(canvas), 'Ada Lovelace');
    await userEvent.clear(emailInput(canvas));
    await userEvent.type(emailInput(canvas), 'ada@example.com');
    const kids = canvas.getByRole('spinbutton', { name: /^kids/i });
    await userEvent.clear(kids);
    await userEvent.type(kids, '11{Enter}');
    await waitFor(() => expect(kids).toHaveAccessibleDescription('Enter a number from 0 to 10'));
    await expect(kids).toHaveAttribute('aria-invalid', 'true');
    await expect(callsOf(args.action)).toHaveLength(0);
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
 * A refusal that is no one field's fault — here the action's per-guest rate limit: nothing stored, a
 * form-level message, no field marked. The button must never claim a save.
 */
export const RefusedTooSoon: Story = {
  args: { action: actionReturning({ fieldErrors: {}, message: TOO_SOON, status: 'error' }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await fillRequired(canvas);
    await userEvent.click(submitButton(canvas));

    await waitFor(
      () => expect(canvas.getAllByRole('alert').map((alert) => alert.textContent)).toContain(TOO_SOON),
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
 * The whole form, completed and sent from the keyboard alone — every field, the switch, the stepper
 * and the button, reached in order by Tab.
 */
export const KeyboardOnly: Story = {
  /*
   * Without the character, whose canvas has nothing a keyboard reaches but is the heaviest thing on
   * the page to load — this story is about the questions.
   */
  args: { action: actionReturning({ status: 'success' }), models: undefined },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.tab();
    await expect(nameInput(canvas)).toHaveFocus();
    await userEvent.keyboard('Ada Lovelace');

    await userEvent.tab();
    await expect(emailInput(canvas)).toHaveFocus();
    await userEvent.keyboard('ada@example.com');

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
    await expect(canvas.getByRole('textbox', { name: /^special requirements/i })).toHaveFocus();
    await userEvent.keyboard('A cot');
    await userEvent.tab();
    await expect(canvas.getByRole('textbox', { name: /^song request/i })).toHaveFocus();
    await userEvent.keyboard('Dancing Queen');

    await userEvent.tab();
    await expect(submitButton(canvas)).toHaveFocus();
    await userEvent.keyboard('{Enter}');

    await waitFor(() => expect(callsOf(args.action)).toHaveLength(1), ROUND_TRIP);
    const [, formData] = callsOf(args.action)[0];
    await expect(formData.get('kidsCount')).toBe('2');
    await expect(formData.get('plusOne.name')).toBe('Charles Babbage');
    await expect(await canvas.findByRole('button', { name: 'Saved' }, ROUND_TRIP)).toHaveFocus();
  }
};

/**
 * The phone frame: one column, nothing sticky, the character gone, and the kids stepper and the
 * ages input still sharing a row.
 */
export const Mobile: Story = {
  parameters: { canvasWidth: MOBILE_WIDTH },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const rail = canvas.getByRole('heading', { level: 1 }).parentElement as HTMLElement;
    await expect(getComputedStyle(rail).position).toBe('static');

    // `display: none`, so it is out of the accessibility tree as well as off the screen.
    await expect(railModel(canvas)).toBeNull();
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
