/*
 * The rungs `Text`'s `mono` variant actually has CSS for.
 *
 * Deliberately **not** merged into `ProjectFontSize`. `2xs` exists only for the mono micro-label and
 * `components/Text` emits `styles[`size_${size}`]` unconditionally, so adding it to the shared type
 * would make `<Text variant="body" size="2xs">` type-check against a class that does not exist —
 * silently unsized type. `TextProps` fences it instead; see the note there.
 *
 * `md` and up are absent for the same reason in the other direction: the mono role is a micro-label,
 * and nothing in the design draws it above the `sm` step.
 */
type ProjectMonoFontSize = '2xs' | 'xs' | 'sm';
