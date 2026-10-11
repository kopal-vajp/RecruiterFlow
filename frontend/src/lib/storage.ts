// ============================================================
// lib/storage.ts — localStorage persistence helpers.
// Zero React imports. Provides typed load/save for AppState.
// ============================================================

import type { AppState, Member, Expense } from '../types';
import sampleData from '../data/sample-data.json';

const STORAGE_KEY = 'trip-splitter-state';

// ---------------------------------------------------------------------------
// Type guards — ensure data from localStorage is structurally valid
// before we trust it with our strict types.
// ---------------------------------------------------------------------------

function isMember(value: unknown): value is Member {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).id === 'string' &&
    typeof (value as Record<string, unknown>).name === 'string'
  );
}

function isExpense(value: unknown): value is Expense {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.description === 'string' &&
    typeof v.amount === 'number' &&
    Number.isInteger(v.amount) &&
    typeof v.paidBy === 'string' &&
    typeof v.date === 'string' &&
    typeof v.category === 'string' &&
    typeof v.split === 'object' &&
    v.split !== null
  );
}

function isAppState(value: unknown): value is AppState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v.members) &&
    v.members.every(isMember) &&
    Array.isArray(v.expenses) &&
    v.expenses.every(isExpense)
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Load persisted AppState from localStorage.
 *
 * Falls back to sample data (imported lazily to avoid circular deps) if:
 *   - localStorage is empty / key missing
 *   - Stored JSON fails to parse
 *   - Stored data fails the structural type guard
 */
export function loadState(): AppState {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);

    if (serialized === null) {
      return getFallback();
    }

    const parsed: unknown = JSON.parse(serialized);

    if (!isAppState(parsed)) {
      console.warn('[storage] Stored state failed type check — using sample data');
      return getFallback();
    }

    return parsed;
  } catch (err) {
    console.error('[storage] Failed to load state — using sample data', err);
    return getFallback();
  }
}

/**
 * Persist the current AppState to localStorage.
 * Silently ignores write errors (e.g. private-mode storage quota exceeded).
 */
export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('[storage] Failed to save state', err);
  }
}

/**
 * Wipe the persisted state, reverting to sample data on next load.
 */
export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore — nothing critical to clear
  }
}

// ---------------------------------------------------------------------------
// Lazy fallback (avoids circular imports at module init time)
// ---------------------------------------------------------------------------

let _fallback: AppState | null = null;

function getFallback(): AppState {
  if (_fallback === null) {
    const raw = sampleData as unknown;
    if (!isAppState(raw)) {
      throw new Error('[storage] sample-data.json does not match AppState shape');
    }
    _fallback = raw;
  }
  return _fallback;
}
