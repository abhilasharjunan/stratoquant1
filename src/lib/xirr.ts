/**
 * XIRR Calculation Engine
 * Uses Newton-Raphson method to find the internal rate of return for irregular cash flows.
 * 
 * Formula: Σ [ CF_i / (1 + rate)^((d_i - d_0)/365) ] = 0
 */

export function calculateXIRR(cashFlows: { amount: number; date: Date }[]) {
  if (cashFlows.length < 2) return null;

  const d0 = cashFlows[0].date.getTime();
  const lastDay = cashFlows[cashFlows.length - 1].date.getTime();
  const totalDays = (lastDay - d0) / (1000 * 60 * 60 * 24);

  // XIRR is meaningless if all cash flows are on the same day
  if (totalDays < 1) return 0;

  const x0 = 0.1;
  const precision = 1e-6;
  const maxIterations = 100;

  const getNetPresentValue = (rate: number) => {
    let npv = 0;
    for (const cf of cashFlows) {
      const days = (cf.date.getTime() - d0) / (1000 * 60 * 60 * 24);
      npv += cf.amount / Math.pow(1 + rate, days / 365);
    }
    return npv;
  };

  const getDerivative = (rate: number) => {
    let derivative = 0;
    for (const cf of cashFlows) {
      const days = (cf.date.getTime() - d0) / (1000 * 60 * 60 * 24);
      derivative -= (days / 365) * cf.amount / Math.pow(1 + rate, (days / 365) + 1);
    }
    return derivative;
  };

  let rate = x0;
  for (let i = 0; i < maxIterations; i++) {
    const npv = getNetPresentValue(rate);
    const derivative = getDerivative(rate);

    if (Math.abs(npv) < precision) return rate;
    if (derivative === 0) break;

    const newRate = rate - npv / derivative;
    // Guard against divergence (Infinity/NaN)
    if (!isFinite(newRate)) break;
    rate = newRate;
  }

  return isFinite(rate) ? rate : 0;
}
