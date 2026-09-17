import type { IButtonElement } from '@/tools/sanity/schema/elements/button';
import type { ILinkElement } from '@/tools/sanity/schema/elements/link';

import mockLink from './mockLink';

const mockButton = (label = 'Learn more', link: ILinkElement = mockLink()): IButtonElement => ({
  label,
  link
});

export default mockButton;
