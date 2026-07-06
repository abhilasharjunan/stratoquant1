import { describe, it, expect } from 'vitest';
import { calculateXIRR } from './xirr';

describe('XIRR Calculation Precision', () => {
  it('calculates correct return for a single investment and valuation', () => {
    const flows = [
      { amount: -10000, date: new Date('2023-01-01') },
      { amount: 11000, date: new Date('2024-01-01') },
    ];
    const result = calculateXIRR(flows);
    expect(result).toBeCloseTo(0.10, 2); 
  });

  it('handles multiple SIP-like investments', () => {
    const flows = [
      { amount: -1000, date: new Date('2023-01-01') },
      { amount: -1000, date: new Date('2023-02-01') },
      { amount: -1000, date: new Date('2023-03-01') },
      { amount: 3300, date: new Date('2023-03-01') },
    ];
    const result = calculateXIRR(flows);
    expect(result).toBeDefined();
    expect(typeof result).toBe('number');
  });

  it('returns null for insufficient data', () => {
    const flows = [{ amount: -1000, date: new Date() }];
    expect(calculateXIRR(flows)).toBeNull();
  });
});
