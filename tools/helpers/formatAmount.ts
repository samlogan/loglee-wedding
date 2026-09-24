/**
 * `120` → `"$120"`, `120.5` → `"$120.50"` — an amount in AUD, as a guest reads it.
 *
 * Cents appear only when there are cents. A fixed two digits would render the ordinary case as
 * "$120.00"; a fixed zero would round "$120.50" down to "$120" and understate the amount.
 * `minimumFractionDigits: 0` alone does not do it — `Intl` then drops the trailing zero and emits
 * "$120.5" — so the digit count is chosen from the value. `en-AU`, because under `en-US` `Intl`
 * writes AUD as "A$120".
 */
const formatAmount = (amount: number): string => {
  const fractionDigits = Number.isInteger(amount) ? 0 : 2;

  return new Intl.NumberFormat('en-AU', {
    currency: 'AUD',
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
    style: 'currency'
  }).format(amount);
};

export default formatAmount;
