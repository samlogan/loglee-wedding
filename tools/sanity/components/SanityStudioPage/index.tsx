import type { Metadata } from 'next';
import { metadata as studioMetadata } from 'next-sanity/studio';

import SanityStudio from '../SanityStudio';

// Set the right `viewport`, `robots` and `referer` meta tags
export const metadata: Metadata = studioMetadata;

const SanityStudioPage = () => <SanityStudio />;

export default SanityStudioPage;
