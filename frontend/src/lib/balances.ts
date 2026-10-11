// ============================================================
// lib/balances.ts — Net balance and settlement calculation.
// Zero React imports. Pure functions only.
// ============================================================

import type { Member, Expense, Balance, Settlement } from '../types';
import { calculateShares } from './split';

/**
 * Compute the net balance for every member across all expenses.
 *
 * Algorithm:
 *   For each expense:
 *     1. Credit the payer by the full amount (they fronted the cash).
 *     2. Debit each member in the split by their share (they consumed it).
 *   Net = credits − debits.
 *
 * Invariant: sum of all balances === 0  (money is conserved).
 *
 * @returns One Balance entry per member, ordered the same as `members`.
 */
export function calculateBalances(
  members: Member[],
  expenses: Expense[],
): Balance[] {
  const net: Record<string, number> = {};

  // Initialise every member at zero so even uninvolved members appear.
  for (const m of members) {
    net[m.id] = 0;
  }

  for (const expense of expenses) {
    // 1. Payer gets credited the full amount.
    if (net[expense.paidBy] !== undefined) {
      net[expense.paidBy] += expense.amount;
    }

    // 2. Each share member gets debited their portion.
    const shares = calculateShares(expense.amount, expense.split);
    for (const [memberId, shareAmount] of Object.entries(shares)) {
      if (net[memberId] !== undefined) {
        net[memberId] -= shareAmount;
      }
    }
  }

  return members.map((m) => ({ memberId: m.id, amount: net[m.id] }));
}

/**
 * Simplify balances into the minimum set of settlement transactions.
 *
 * Uses the greedy "most-negative vs. most-positive" algorithm:
 *   - Pick the member who owes the most (most negative balance).
 *   - Pick the member who is owed the most (most positive balance).
 *   - Settle as much as possible between them in one transfer.
 *   - Repeat until all balances are zero (within 1-paise rounding).
 *
 * This does NOT guarantee the globally minimum number of transactions
 * (which is NP-hard), but is a well-known practical approximation.
 *
 * @returns List of Settlement objects sorted by amount DESC.
 */
export function simplifySettlements(balances: Balance[]): Settlement[] {
  const settlements: Settlement[] = [];

  // Work on a mutable copy, filtering out zeroes.
  const ledger: Balance[] = balances
    .filter((b) => Math.abs(b.amount) > 0)
    .map((b) => ({ ...b }));

  while (ledger.length >= 2) {
    // Sort every iteration: creditors (positive) DESC, debtors (negative) first.
    ledger.sort((a, b) => a.amount - b.amount);

    const debtor = ledger[0];    // most negative
    const creditor = ledger[ledger.length - 1]; // most positive

    if (debtor.amount >= 0 || creditor.amount <= 0) break; // fully settled

    const transfer = Math.min(-debtor.amount, creditor.amount);

    settlements.push({
      from: debtor.memberId,
      to: creditor.memberId,
      amount: transfer,
    });

    debtor.amount += transfer;
    creditor.amount -= transfer;

    // Remove settled entries (within 1-paise epsilon for safety).
    const remaining = ledger.filter((b) => Math.abs(b.amount) > 1);
    ledger.length = 0;
    ledger.push(...remaining);
  }

  return settlements.sort((a, b) => b.amount - a.amount);
}

/**
 * Return the total amount spent across all expenses in paise.
 */
export function totalSpend(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + e.amount, 0);
}
