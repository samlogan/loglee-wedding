import type { ILinkElement } from '@/tools/sanity/schema/elements/link';

const mockLink = (overrides: Partial<ILinkElement> = {}): ILinkElement => ({
  linkType: 'internal',
  internalLink: {
    title: 'Sample Page',
    slug: { current: 'sample-page' },
    pathname: '/sample-page/'
  },
  externalLink: undefined,
  phone: undefined,
  email: undefined,
  action: undefined,
  ...overrides
});

const mockExternalLink = (href = 'https://example.com'): ILinkElement => ({
  linkType: 'external',
  externalLink: href
});

const mockPhoneLink = (phone = '+61400000000'): ILinkElement => ({
  linkType: 'phone',
  phone
});

const mockEmailLink = (email = 'hello@example.com'): ILinkElement => ({
  linkType: 'email',
  email
});

export default mockLink;
export { mockExternalLink, mockPhoneLink, mockEmailLink };
