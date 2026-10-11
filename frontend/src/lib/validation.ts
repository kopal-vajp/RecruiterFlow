// ============================================================
// lib/validation.ts — Expense form validation.
// Zero React imports. Returns a flat error map: field → message.
// ============================================================

import type { Split } from '../types';

// Minimum and maximum expense amounts in paise
const MIN_AMOUNT_PAISE = 2000;        // ₹20.00
const MAX_AMOUNT_PAISE = 1_000_000_00; // ₹10,00,000 (1 crore paise)

export type ValidationErrors = Record<string, string>;

/**
 * Validate all fields of an expense before it is persisted.
 *
 * @returns A record of field → error message.
 *          An empty record means the form is valid.
 */
export function validateExpense(
  description: string,
  amountPaise: number,
  paidBy: string,
  date: string,
  category: string,
  split: Split,
): ValidationErrors {
  const errors: ValidationErrors = {};

  // ── Description ────────────────────────────────────────────
  const desc = description.trim();
  if (desc === '') {
    errors.description = 'Description is required';
  } else if (desc.length > 60) {
    errors.description = 'Description must be 60 characters or fewer';
  }

  // ── Amount ─────────────────────────────────────────────────
  if (!Number.isInteger(amountPaise) || amountPaise <= MIN_AMOUNT_PAISE) {
    errors.amount = 'Amount must be more than ₹20';
  } else if (amountPaise > MAX_AMOUNT_PAISE) {
    errors.amount = 'Amount cannot exceed ₹10,00,000';
  }

  // ── Payer ──────────────────────────────────────────────────
  if (!paidBy || paidBy.trim() === '') {
    errors.paidBy = 'Select who paid';
  }

  // ── Category ───────────────────────────────────────────────
  if (!category || category.trim() === '') {
    errors.category = 'Select a category';
  }

  // ── Date ───────────────────────────────────────────────────
  if (!date) {
    errors.date = 'Date is required';
  } else {
    const inputDate = new Date(date);
    if (isNaN(inputDate.getTime())) {
      errors.date = 'Invalid date';
    } else {
      // Compare calendar day only (strip time portion)
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (inputDate > today) {
        errors.date = 'Date cannot be in the future';
      }
    }
  }

  // ── Split ──────────────────────────────────────────────────
  const splitError = validateSplit(amountPaise, split);
  if (splitError !== null) {
    errors.split = splitError;
  }

  return errors;
}

/**
 * Validate just the split portion of an expense.
 *
 * @returns An error string, or null if the split is valid.
 */
export function validateSplit(amountPaise: number, split: Split): string | null {
  switch (split.type) {
    case 'equal': {
      if (split.memberIds.length === 0) {
        return 'Select at least one member to split with';
      }
      return null;
    }

    case 'exact': {
      const shareValues = Object.values(split.shares);
      if (shareValues.length === 0) {
        return 'Add at least one member to the exact split';
      }
      if (shareValues.some((s) => s < 0)) {
        return 'Share amounts cannot be negative';
      }

      const total = shareValues.reduce((a, b) => a + b, 0);
      const diff = amountPaise - total;

      if (diff > 0) {
        return `₹${(diff / 100).toFixed(2)} still to assign`;
      }
      if (diff < 0) {
        return `Over-assigned by ₹${(Math.abs(diff) / 100).toFixed(2)}`;
      }
      return null;
    }

    case 'percent': {
      const shareValues = Object.values(split.shares);
      if (shareValues.length === 0) {
        return 'Add at least one member to the percent split';
      }
      if (shareValues.some((s) => s < 0)) {
        return 'Percentages cannot be negative';
      }

      const total = shareValues.reduce((a, b) => a + b, 0);
      // Allow ±0.01% tolerance for floating-point display drift
      if (Math.abs(total - 100) > 0.01) {
        return `Percentages must sum to 100% (currently ${total.toFixed(2)}%)`;
      }
      return null;
    }
  }
}

/**
 * Quick helper: returns true when an expense form has no errors.
 */
export function isExpenseValid(
  description: string,
  amountPaise: number,
  paidBy: string,
  date: string,
  category: string,
  split: Split,
): boolean {
  return (
    Object.keys(validateExpense(description, amountPaise, paidBy, date, category, split))
      .length === 0
  );
}
