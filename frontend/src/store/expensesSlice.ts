// ============================================================
// store/expensesSlice.ts — Redux slice for the full trip state.
//
// Holds both `members` and `expenses` in one slice (they are
// always co-loaded from localStorage together, so splitting them
// would only add boilerplate without benefit at this scale).
// ============================================================

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { AppState, Expense, Member } from '../types';
import { loadState } from '../lib/storage';

// Hydrate initial state from localStorage (or sample data as fallback).
const initialState: AppState = loadState();

export const expensesSlice = createSlice({
  name: 'trip',
  initialState,
  reducers: {
    // ── Expense actions ────────────────────────────────────────

    /**
     * Prepend a new expense so the most-recently-added item
     * appears first in the list (UI reads the array top-to-bottom).
     */
    addExpense(state, action: PayloadAction<Expense>) {
      state.expenses.unshift(action.payload);
    },

    /**
     * Replace an existing expense identified by id.
     * No-ops silently if the id is not found.
     */
    updateExpense(state, action: PayloadAction<Expense>) {
      const index = state.expenses.findIndex((e) => e.id === action.payload.id);
      if (index !== -1) {
        state.expenses[index] = action.payload;
      }
    },

    /**
     * Remove an expense by id.
     */
    deleteExpense(state, action: PayloadAction<string>) {
      state.expenses = state.expenses.filter((e) => e.id !== action.payload);
    },

    // ── Member actions ─────────────────────────────────────────

    /**
     * Add a new member to the trip.
     */
    addMember(state, action: PayloadAction<Member>) {
      state.members.push(action.payload);
    },

    /**
     * Remove a member by id.
     * Note: does NOT cascade-delete their expenses — caller is responsible
     * for deciding what to do with orphaned expenses.
     */
    removeMember(state, action: PayloadAction<string>) {
      state.members = state.members.filter((m) => m.id !== action.payload);
    },

    /**
     * Rename a member in place.
     */
    renameMember(
      state,
      action: PayloadAction<{ id: string; name: string }>,
    ) {
      const member = state.members.find((m) => m.id === action.payload.id);
      if (member) {
        member.name = action.payload.name;
      }
    },

    // ── Global actions ─────────────────────────────────────────

    /**
     * Reset the store to a specific state (used for "load sample data" or
     * "clear all" features).
     */
    resetState(_state, action: PayloadAction<AppState>) {
      return action.payload;
    },
  },
});

export const {
  addExpense,
  updateExpense,
  deleteExpense,
  addMember,
  removeMember,
  renameMember,
  resetState,
} = expensesSlice.actions;

export default expensesSlice.reducer;
