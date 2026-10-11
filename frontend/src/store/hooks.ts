// ============================================================
// store/hooks.ts — Typed React-Redux hooks.
//
// Import useAppDispatch and useAppSelector from here instead of
// react-redux directly.  This gives full TypeScript inference on
// both the dispatch type and the selector return type without
// needing explicit generics at every call site.
// ============================================================

import { useDispatch, useSelector } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from './index';

/**
 * Typed dispatch hook.
 * Usage: const dispatch = useAppDispatch();
 */
export const useAppDispatch: () => AppDispatch = useDispatch;

/**
 * Typed selector hook.
 * Usage: const members = useAppSelector(s => s.trip.members);
 */
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
