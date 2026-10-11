// ============================================================
// types/index.ts — All shared domain types for Trip Splitter.
// No React imports. These are plain data-shape contracts.
// ============================================================

export interface Member {
  id: string;
  name: string;
}

export type SplitType = 'equal' | 'exact' | 'percent';

/** Split among selected members equally, remainder distributed 1 paise at a time */
export interface EqualSplit {
  type: 'equal';
  memberIds: string[];
}

/** Each member is assigned an explicit share in paise that must sum to total */
export interface ExactSplit {
  type: 'exact';
  shares: Record<string, number>; // paise
}

/** Each member is assigned a percentage; shares must sum to 100 */
export interface PercentSplit {
  type: 'percent';
  shares: Record<string, number>; // e.g. 33.33
}

export type Split = EqualSplit | ExactSplit | PercentSplit;

export interface Expense {
  id: string;
  description: string;
  amount: number;   // integer paise — NEVER a float
  paidBy: string;   // member id
  date: string;     // YYYY-MM-DD
  category: string;
  split: Split;
}

/** Persisted shape — everything in localStorage keyed here */
export interface AppState {
  members: Member[];
  expenses: Expense[];
}

/**
 * Net balance per member across all expenses.
 * Positive  → member is owed money (they paid more than their share).
 * Negative  → member owes money (they consumed more than they paid).
 * Zero      → member is settled.
 */
export interface Balance {
  memberId: string;
  amount: number; // integer paise
}

/** A single settlement instruction produced by the simplification algorithm */
export interface Settlement {
  from: string;  // member id — owes money
  to: string;    // member id — is owed money
  amount: number; // integer paise — positive
}

export const CATEGORIES = [
  'Food',
  'Stay',
  'Travel',
  'Activities',
  'Shopping',
  'Other',
] as const;

export type Category = (typeof CATEGORIES)[number];
