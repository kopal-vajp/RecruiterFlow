// ============================================================
// store/index.ts — Redux store configuration.
//
// The store.subscribe() call wires automatic localStorage persistence:
// every dispatched action triggers saveState() so the tab can be
// refreshed or closed without losing data.
// ============================================================

import { configureStore } from '@reduxjs/toolkit';
import expensesReducer from './expensesSlice';
import { saveState } from '../lib/storage';

export const store = configureStore({
  reducer: {
    trip: expensesReducer,
  },
  // Middleware is intentionally left at the RTK default (includes
  // serializability and immutability checks in development).
});

// ---------------------------------------------------------------------------
// Persistence subscriber
// ---------------------------------------------------------------------------

// Throttle writes to avoid hammering localStorage on rapid dispatches.
// Simple leading-edge debounce with requestAnimationFrame.
let _saveScheduled = false;

store.subscribe(() => {
  if (_saveScheduled) return;
  _saveScheduled = true;

  // Defer to the next animation frame so multiple synchronous dispatches
  // in the same JS task only produce one write.
  requestAnimationFrame(() => {
    saveState(store.getState().trip);
    _saveScheduled = false;
  });
});

// ---------------------------------------------------------------------------
// Exported types — use these everywhere instead of importing store directly.
// ---------------------------------------------------------------------------

/** Full Redux state shape */
export type RootState = ReturnType<typeof store.getState>;

/** Typed dispatch that understands thunks if added later */
export type AppDispatch = typeof store.dispatch;
