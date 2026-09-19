import stringClean from './stringClean';

/**
 * Whether a section's `width` field asks for the contained layout. Anything else — unset, `full`, a
 * value from before the field existed — is full width, the default. Cleaned first, because in draft
 * mode a stega payload rides on the string.
 */
const isContained = (width?: string | null): boolean => stringClean(width ?? '') === 'contained';

export default isContained;
