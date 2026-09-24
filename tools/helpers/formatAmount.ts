/**
 * `120` → `"$120"`, `120.5` → `"$120.50"` — an amount in AUD, as a guest reads it.
 *
 * Cents appear only when there are cents. A fixed two digits would render the ordinary case as
 * "$120.00"; a fixed zero would round "$120.50" down to "$120" and understate the amount.
 * `minimumFractionDigits: 0` alone does not do it — `Intl` then drops the trailing zero and emits
 * "$120.5" — so the digit count is chosen from the value. `en-AU`, because under `en-US` `Intl`
 * writes AUD as "A$120".
 *
 * `withCurrency` adds "AUD" — `"$120 AUD"` — for a guest outside Australia (`showsCurrency`).
 */
const formatAmount = (amount: number, { withCurrency = false }: { withCurrency?: boolean } = {}): string => {
  const fractionDigits = Number.isInteger(amount) ? 0 : 2;

  const formatted = new Intl.NumberFormat('en-AU', {
    currency: 'AUD',
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
    style: 'currency'
  }).format(amount);
  return withCurrency ? `${formatted} AUD` : formatted;
};

/**
 * Whether a guest's prices should say "AUD": every guest outside Australia, for whom a bare "$" reads
 * as their own dollar — the same guests who pay by Wise (`paymentRegionOf`).
 */
export const showsCurrency = (guest: { payment: 'au' | 'wise' }) => guest.payment === 'wise';

export default formatAmount;
