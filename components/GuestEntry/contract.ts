/** The entry form's one field. */
export const GUEST_ID_FIELD = 'guestId';

export type GuestEntryState = { status: 'idle' } | { status: 'error'; message: string };

export type GuestEntryAction = (previousState: GuestEntryState, formData: FormData) => Promise<GuestEntryState>;

export const GUEST_ENTRY_INITIAL_STATE: GuestEntryState = { status: 'idle' };
