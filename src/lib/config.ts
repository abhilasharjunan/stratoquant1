/**
 * Central place for finance-calculation constants that were previously
 * hardcoded independently in multiple files (risk-analysis.ts, risk-calculations.ts).
 * See FolioVeda_Audit_and_Roadmap.md, section 1.10 / 3.9.
 */

// Approx. 10-year Indian G-Sec yield, used as the risk-free rate in Sharpe/Sortino/
// Treynor/alpha calculations. Override via env so it can be refreshed periodically
// (e.g. from the weekly risk-sync cron) without a code change.
export const RISK_FREE_RATE = Number(process.env.RISK_FREE_RATE ?? 0.065);
