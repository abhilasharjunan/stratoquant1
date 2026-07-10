import { getFundInsights } from "@/lib/finapi";

/**
 * Weighted portfolio overlap between two funds, using the standard MIN-weight
 * method: for every stock held by both funds, overlap contribution is
 * min(weight_in_fund_A, weight_in_fund_B); total overlap % is the sum across all
 * common stocks. This didn't exist anywhere in the codebase before — see
 * FolioVeda_Audit_and_Roadmap.md, section 1.7/3.7.
 *
 * Caveat: getFundInsights() only returns each fund's top 15 disclosed holdings
 * (finapi.ts), so this measures overlap among *disclosed top holdings*, not
 * full portfolios. Surface that caveat in the UI rather than implying
 * completeness.
 */

export interface CommonStock {
  stockName: string;
  weightA: number;
  weightB: number;
  minWeight: number;
}

export interface OverlapResult {
  schemeCodeA: string;
  schemeCodeB: string;
  schemeNameA: string;
  schemeNameB: string;
  overlapPercentage: number;
  commonStocks: CommonStock[];
}

export async function calculateFundOverlap(
  schemeCodeA: string,
  schemeCodeB: string
): Promise<OverlapResult | null> {
  if (schemeCodeA === schemeCodeB) return null;

  const [insightsA, insightsB] = await Promise.all([
    getFundInsights(schemeCodeA),
    getFundInsights(schemeCodeB),
  ]);

  if (!insightsA?.holdings.length || !insightsB?.holdings.length) return null;

  const mapB = new Map(insightsB.holdings.map((h) => [h.stockName.trim().toLowerCase(), h.allocation]));
  const commonStocks: CommonStock[] = [];
  let overlapPercentage = 0;

  for (const stockA of insightsA.holdings) {
    const key = stockA.stockName.trim().toLowerCase();
    const weightB = mapB.get(key);
    if (weightB !== undefined) {
      const minWeight = Math.min(stockA.allocation, weightB);
      overlapPercentage += minWeight;
      commonStocks.push({ stockName: stockA.stockName, weightA: stockA.allocation, weightB, minWeight });
    }
  }

  commonStocks.sort((a, b) => b.minWeight - a.minWeight);

  return {
    schemeCodeA,
    schemeCodeB,
    schemeNameA: insightsA.schemeName,
    schemeNameB: insightsB.schemeName,
    overlapPercentage,
    commonStocks,
  };
}

/**
 * Portfolio-wide overlap heatmap: every distinct pair of the given scheme codes,
 * fetching each fund's insights only once (not once per pair) to keep this to
 * N external lookups instead of N^2.
 */
export async function calculatePortfolioOverlapMatrix(schemeCodes: string[]): Promise<OverlapResult[]> {
  const uniqueCodes = [...new Set(schemeCodes)];
  if (uniqueCodes.length < 2) return [];

  const insightsByCode = new Map(
    await Promise.all(
      uniqueCodes.map(async (code) => [code, await getFundInsights(code)] as const)
    )
  );

  const results: OverlapResult[] = [];

  for (let i = 0; i < uniqueCodes.length; i++) {
    for (let j = i + 1; j < uniqueCodes.length; j++) {
      const codeA = uniqueCodes[i];
      const codeB = uniqueCodes[j];
      const insightsA = insightsByCode.get(codeA);
      const insightsB = insightsByCode.get(codeB);
      if (!insightsA?.holdings.length || !insightsB?.holdings.length) continue;

      const mapB = new Map(insightsB.holdings.map((h) => [h.stockName.trim().toLowerCase(), h.allocation]));
      const commonStocks: CommonStock[] = [];
      let overlapPercentage = 0;

      for (const stockA of insightsA.holdings) {
        const key = stockA.stockName.trim().toLowerCase();
        const weightB = mapB.get(key);
        if (weightB !== undefined) {
          const minWeight = Math.min(stockA.allocation, weightB);
          overlapPercentage += minWeight;
          commonStocks.push({ stockName: stockA.stockName, weightA: stockA.allocation, weightB, minWeight });
        }
      }

      commonStocks.sort((a, b) => b.minWeight - a.minWeight);
      results.push({
        schemeCodeA: codeA,
        schemeCodeB: codeB,
        schemeNameA: insightsA.schemeName,
        schemeNameB: insightsB.schemeName,
        overlapPercentage,
        commonStocks,
      });
    }
  }

  return results;
}
