import { describe, it, expect } from 'vitest';
import { parseAndValidateCSV } from './csv-engine';

describe('Security & Input Stress Tests', () => {
  it('should reject CSVs with formula injections (CSV Injection)', async () => {
    const maliciousCsv = `schemeName,schemeCode,units,investedAmount,date
    "Test Fund,=SUM(1+1)",10,1000,2023-01-01
    "Evil Fund","=CMD('calc')",20,2000,2023-01-01`;

    const { data, errors } = await parseAndValidateCSV(maliciousCsv);
    
    // The Zod schema for schemeCode should ideally prevent formula-like strings
    // but here we check if the validation flags them or if they are treated as plain text
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject negative units or amounts', async () => {
    const invalidCsv = `schemeName,schemeCode,units,investedAmount,date
    "Fund A","1234",-10,-1000,2023-01-01`;

    const { errors } = await parseAndValidateCSV(invalidCsv);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should handle massive CSV inputs without crashing', async () => {
    const row = `Fund Name,1234,10,1000,2023-01-01\n`;
    const hugeCsv = "schemeName,schemeCode,units,investedAmount,date\n" + row.repeat(5000);
    
    const start = performance.now();
    const { data } = await parseAndValidateCSV(hugeCsv);
    const end = performance.now();
    
    expect(data.length).toBe(5000);
    expect(end - start).toBeLessThan(1000); // Must parse 5k rows in < 1s
  });
});
