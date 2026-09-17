/**
 * Does this Portable Text array actually have anything in it?
 *
 * `Boolean(blocks?.length)` is the obvious test and it is wrong at the edge that matters. A GROQ
 * projection returns `null` for an absent field and `[]` for an empty one, both of which `.length`
 * handles — but an editor who types into a rich-text field and then deletes the text leaves the
 * array holding one `normal` block whose single child has `text: ''`. Sanity does not unset it. So
 * `.length` is 1, the field reads as populated, and a section renders a layout branch around an
 * empty paragraph: in `HeaderDisplaySection` that costs the heading half the row.
 *
 * `TextBlock` does not save the caller either — its own guard is `blocks.length < 1`, so it renders
 * the empty `<p>` rather than returning null.
 *
 * A member that is not a `block` — an image, a video, a divider, a button group — is treated as
 * content without looking inside it, because those render something regardless of any text. The one
 * case that slips through is a `blockContentButtons` holding zero buttons; that renders nothing, and
 * is not worth teaching this helper about every block-level type in the schema.
 */
const hasBlockContent = (blocks?: SanityTextBlock[] | null): boolean =>
  Boolean(
    blocks?.some((block) =>
      block?._type === 'block' ? block.children?.some((child) => Boolean(child?.text?.trim())) : Boolean(block)
    )
  );

export default hasBlockContent;
