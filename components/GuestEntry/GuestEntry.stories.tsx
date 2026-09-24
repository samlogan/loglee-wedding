import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import GuestEntry from '.';
import type { GuestEntryAction } from './contract';

/** An action that answers every attempt the same way — the stories never reach the sheet. */
const answering =
  (message?: string): GuestEntryAction =>
  async () =>
    message ? { message, status: 'error' } : { status: 'idle' };

const meta = {
  title: 'Forms/Guest Entry',
  component: GuestEntry,
  tags: ['autodocs'],
  args: {
    action: answering(),
    names: 'Sam & Lauren'
  }
} satisfies Meta<typeof GuestEntry>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The page every guest sees until they have entered their ID. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { level: 1 })).toHaveTextContent('Sam & Lauren');
    await expect(canvas.getByLabelText(/guest id/i)).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Enter' })).toBeInTheDocument();
  }
};

/** An ID that is not on the guest list is refused, and the guest is told so. */
export const WrongId: Story = {
  args: { action: answering("We couldn't find that guest ID. Check your invitation and try again.") },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText(/guest id/i), 'NOBODY-0000');
    await userEvent.click(canvas.getByRole('button', { name: 'Enter' }));
    // The message, not "the alert": the field carries its own alert region for validation errors.
    await waitFor(() => expect(canvas.getByText(/couldn't find that guest ID/)).toBeInTheDocument());
  }
};

/** Sent from another page, the form carries that page along, to return the guest there once they are in. */
export const WithNext: Story = {
  args: { next: '/weekend/' },
  play: async ({ canvasElement }) => {
    const hidden = canvasElement.querySelector<HTMLInputElement>('input[name="next"]');
    await expect(hidden?.value).toBe('/weekend/');
  }
};
