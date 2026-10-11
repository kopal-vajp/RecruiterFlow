// ============================================================
// lib/money.ts — Pure INR formatting and parsing utilities.
// Zero React imports. Treats all amounts as integer paise internally.
// ============================================================

/**
 * Format an integer paise value as an INR currency string.
 *
 * Examples:
 *   formatINR(240000)  → "₹2,400.00"
 *   formatINR(149999)  → "₹1,499.99"
 *   formatINR(-50000)  → "-₹500.00"  (negative amounts prefixed with minus)
 */
export function formatINR(paise: number): string {
  const isNegative = paise < 0;
  const rupees = Math.abs(paise) / 100;

  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);

  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Parse a user-typed amount string into integer paise.
 *
 * Strips currency symbols, commas, and whitespace before parsing.
 * Uses Math.round to avoid floating-point drift (e.g. "33.33" → 3333).
 *
 * Returns 0 for empty / non-numeric input (caller should validate separately).
 *
 * Examples:
 *   parseAmount("24,000")   → 2400000
 *   parseAmount("₹1499.99") → 149999
 *   parseAmount("")         → 0
 *   parseAmount("abc")      → 0
 */
export function parseAmount(input: string): number {
  // Remove currency symbols, commas, whitespace — keep digits, dot, minus
  const clean = input.replace(/[^\d.-]/g, '');
  if (clean === '' || clean === '-') return 0;

  const floatVal = parseFloat(clean);
  if (!isFinite(floatVal)) return 0;

  return Math.round(floatVal * 100);
}

/**
 * Convert integer paise to a display string in rupees (no currency symbol).
 * Useful for <input> default values.
 *
 * Examples:
 *   paiseToRupeeString(240000)  → "2400.00"
 *   paiseToRupeeString(0)       → "0.00"
 */
export function paiseToRupeeString(paise: number): string {
  return (paise / 100).toFixed(2);
}
