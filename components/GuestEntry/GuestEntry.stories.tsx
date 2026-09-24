import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import mockImage from '@/tools/storybook/mockImage';

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
    date: '12–14.02.27',
    image: mockImage({ altText: 'Sam and Lauren', height: 1172, seed: 'guest-entry', width: 2038 }),
    partners: ['Sam', 'Lauren'],
    summary: '12–14 Feb 2027 · The Lodge Jamberoo'
  }
} satisfies Meta<typeof GuestEntry>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The page every guest sees until they have entered their ID, drawn like the invitation email. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { level: 1 })).toHaveTextContent('Sam & Lauren');
    await expect(canvas.getByText('are getting married')).toBeInTheDocument();
    await expect(canvas.getByText('12–14 Feb 2027 · The Lodge Jamberoo')).toBeInTheDocument();
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

/** Without a photo in Wedding Settings, the card follows the names directly. */
export const WithoutPhoto: Story = {
  args: { image: null },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('img')).toBeNull();
    await expect(within(canvasElement).getByLabelText(/guest id/i)).toBeInTheDocument();
  }
};
