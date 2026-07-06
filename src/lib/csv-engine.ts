import { z } from "zod";
import Papa from "papaparse";

// Regex to prevent CSV Injection (Formula Injection)
// Disallows strings starting with =, +, -, or @
const formulaInjectionRegex = /^[^=+\-@]/;

export const CSVHoldingSchema = z.object({
  schemeName: z.string().min(1).refine((val) => formulaInjectionRegex.test(val), {
    message: "Invalid characters detected: Scheme name cannot start with formulas",
  }),
  schemeCode: z.string().min(1).refine((val) => formulaInjectionRegex.test(val), {
    message: "Invalid characters detected: Scheme code cannot start with formulas",
  }),
  units: z.coerce.number().positive(),
  investedAmount: z.coerce.number().positive(),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date"),
});

export async function parseAndValidateCSV(csvString: string) {
  return new Promise<{ data: any[], errors: any[] }>((resolve) => {
    Papa.parse(csvString, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data: any[] = [];
        const errors: any[] = [];

        results.data.forEach((row: any, index: number) => {
          const validation = CSVHoldingSchema.safeParse(row);
          if (validation.success) {
            data.push(validation.data);
          } else {
            errors.push({ row: index + 2, errors: validation.error.format() });
          }
        });
        resolve({ data, errors });
      },
    });
  });
}
