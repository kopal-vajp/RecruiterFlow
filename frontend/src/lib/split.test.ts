import { describe, it, expect } from 'vitest';
import { calculateShares } from './split';
import type { Split } from '../types';

describe('Split Logic', () => {
  it('splits ₹100 (10000 paise) equally between 3 people without losing a paisa', () => {
    const split: Split = {
      type: 'equal',
      memberIds: ['m1', 'm2', 'm3'],
    };

    // 100 INR = 10000 paise. 10000 / 3 = 3333.33...
    // We expect the remainder (1 paisa) to go to the first member.
    const shares = calculateShares(10000, split);

    expect(shares['m1']).toBe(3334);
    expect(shares['m2']).toBe(3333);
    expect(shares['m3']).toBe(3333);

    // Ensure total is exactly 10000
    const total = Object.values(shares).reduce((a, b) => a + b, 0);
    expect(total).toBe(10000);
  });
});
