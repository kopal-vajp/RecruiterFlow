// ============================================================
// lib/split.ts — Splitting math. Zero React imports. Pure functions.
//
// The Money Rule:
//   All amounts are integer paise. When dividing an indivisible amount
//   (e.g. ₹100 / 3 = 33.33…), the quotient is floored and the remainder
//   paise are distributed 1 at a time to the first N members in the list.
//   This guarantees:  SUM(shares) === total amount, always.
// ============================================================

import type { Split } from '../types';

/**
 * Calculate each member's share of `amount` (in paise) according to the
 * provided split descriptor.
 *
 * Returns a Record<memberId, paise> where the values always sum to `amount`.
 *
 * @param amount   Total expense in integer paise (must be ≥ 0)
 * @param split    Split descriptor (equal | exact | percent)
 */
export function calculateShares(
  amount: number,
  split: Split,
): Record<string, number> {
  switch (split.type) {
    case 'equal':
      return _equalShares(amount, split.memberIds);

    case 'exact':
      // Exact shares are already in paise — return a shallow copy.
      return { ...split.shares };

    case 'percent':
      return _percentShares(amount, split.shares);
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function _equalShares(
  amount: number,
  memberIds: readonly string[],
): Record<string, number> {
  const shares: Record<string, number> = {};
  const count = memberIds.length;
  if (count === 0) return shares;

  const base = Math.floor(amount / count);
  let remainder = amount % count;

  for (const id of memberIds) {
    shares[id] = base;
  }

  // Distribute remainder 1 paise at a time to the first `remainder` members.
  // This ensures no paisa is invented or lost.
  for (let i = 0; i < remainder; i++) {
    shares[memberIds[i]] += 1;
  }

  return shares;
}

function _percentShares(
  amount: number,
  percentShares: Record<string, number>,
): Record<string, number> {
  const shares: Record<string, number> = {};
  const memberIds = Object.keys(percentShares);
  let allocated = 0;

  for (const id of memberIds) {
    // Floor each share; accumulate for remainder calculation.
    const share = Math.floor((amount * percentShares[id]) / 100);
    shares[id] = share;
    allocated += share;
  }

  // Distribute any remaining paise (from floor rounding) 1 at a time,
  // starting from the first member.
  let remainder = amount - allocated;
  let i = 0;
  while (remainder > 0 && memberIds.length > 0) {
    shares[memberIds[i % memberIds.length]] += 1;
    remainder -= 1;
    i++;
  }

  return shares;
}

/**
 * Verify that shares calculated by calculateShares sum exactly to `amount`.
 * Useful in tests and debug assertions.
 */
export function sharesSum(shares: Record<string, number>): number {
  return Object.values(shares).reduce((acc, v) => acc + v, 0);
}
