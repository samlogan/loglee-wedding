import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import Accordion from '.';

const meta = {
  title: 'Surfaces/Accordion',
  component: Accordion,
  tags: ['autodocs']
} satisfies Meta<typeof Accordion>;

export default meta;

type Story = StoryObj<typeof meta>;

const items = (
  <>
    <Accordion.Item title="What is this?">
      <p>This is the first item's expanded content.</p>
    </Accordion.Item>
    <Accordion.Item title="How does it work?">
      <p>This is the second item's expanded content.</p>
    </Accordion.Item>
    <Accordion.Item title="Can I customise it?">
      <p>This is the third item's expanded content.</p>
    </Accordion.Item>
  </>
);

export const Default: Story = { args: { children: items } };

export const FirstOpen: Story = { args: { activeIndex: 0, children: items } };

export const LimitTwo: Story = {
  args: { showAll: false, showLimit: 2, children: items }
};

/**
 * `headingLevel` wraps each trigger in a heading — the ARIA APG accordion pattern.
 *
 * Around the button, never inside it: a heading inside a `<button>` is flattened by the HTML-AAM
 * mapping to a text alternative, so it publishes no outline entry and heading navigation skips the
 * whole list. Omit the prop and the wrapper is a plain `<div>`, which is what `Default` above
 * renders.
 */
export const WithHeadings: Story = {
  args: {
    children: (
      <>
        <Accordion.Item headingLevel={3} title="What is this?">
          <p>{`This is the first item's expanded content.`}</p>
        </Accordion.Item>
        <Accordion.Item headingLevel={3} title="How does it work?">
          <p>{`This is the second item's expanded content.`}</p>
        </Accordion.Item>
      </>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const headings = canvas.getAllByRole('heading', { level: 3 });

    await expect(headings).toHaveLength(2);
    // The heading wraps the trigger; the trigger keeps its own name and role.
    await expect(within(headings[0]).getByRole('button')).toHaveAccessibleName('What is this?');
    await expect(canvas.getAllByRole('button')[0]).toHaveAttribute('type', 'button');
  }
};

/**
 * `ariaLabel` is the escape hatch for a trigger whose content carries no text of its own.
 *
 * It is the accessible-name override of last resort — it replaces the button's content outright,
 * which is precisely why `AccordionItem` no longer sets it by default. An icon-only trigger has no
 * other way to be named; a trigger with a question in it does not need one.
 */
export const IconOnlyTrigger: Story = {
  args: {
    children: (
      <Accordion.Item ariaLabel="More detail" title={<span aria-hidden="true">{'\u2139'}</span>}>
        <p>An icon-only trigger has to say what it is some other way.</p>
      </Accordion.Item>
    )
  },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button');

    await expect(button).toHaveAccessibleName('More detail');
    /*
     * Nothing is reachable inside the collapsed panel. `max-height: 0` hides it and removes it from
     * the tab order not at all, so the panel carries `inert` — asserted here as well as in the FAQ
     * section, because this is the component that owns the behaviour.
     */
    await expect(canvasElement.querySelector('[inert]')).toBeTruthy();
  }
};
