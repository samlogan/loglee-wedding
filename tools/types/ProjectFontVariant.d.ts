type ProjectFontVariant = 'display' | 'heading' | 'body' | 'mono';

/*
 * The three proportional tiers — everything `mono` is not.
 *
 * Components that render *prose* take this rather than the full union: `TextTitle` and `TextBlock`
 * set CMS rich text, and both pass a `ProjectFontSize` straight through to `Text`. `mono` has rules
 * only for `2xs`/`xs`/`sm` (`ProjectMonoFontSize`), so letting either offer it would reintroduce
 * exactly the unsized-type hazard `TextProps` fences — one component removed, where nothing checks.
 *
 * It is also a content judgement rather than only a type one: the mono role is a micro-label — a
 * time, a chip, an eyebrow — and a paragraph of CMS copy is not one.
 */
type ProjectProseFontVariant = Exclude<ProjectFontVariant, 'mono'>;
