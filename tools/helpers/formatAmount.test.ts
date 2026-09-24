import { describe, expect, it } from 'vitest';

import formatAmount from './formatAmount';

describe('formatAmount', () => {
  it('renders a whole number with no cents', () => {
    // The ordinary case. "$120.00" reads as a price list; the design draws a bare figure.
    expect(formatAmount(120)).toBe('$120');
    expect(formatAmount(0)).toBe('$0');
  });

  it('renders cents when there are cents', () => {
    /*
     * `minimumFractionDigits: 0` alone gives "$120.5" — `Intl` drops the trailing zero — which is
     * why the digit count is chosen from the value rather than fixed.
     */
    expect(formatAmount(120.5)).toBe('$120.50');
    expect(formatAmount(0.5)).toBe('$0.50');
  });

  it('rounds to cents and groups thousands', () => {
    expect(formatAmount(120.456)).toBe('$120.46');
    expect(formatAmount(1200)).toBe('$1,200');
  });

  it('uses a bare dollar sign, not the international form', () => {
    /*
     * Pinned because the locale is the thing that decides it: `Intl` formats AUD as "A$120" under
     * `en-US`, and the design draws "$" (node 1:675). If this ever fails, the locale constant moved
     * or the runtime's ICU data did — not the amount.
     */
    expect(formatAmount(120).startsWith('$')).toBe(true);
  });
});
