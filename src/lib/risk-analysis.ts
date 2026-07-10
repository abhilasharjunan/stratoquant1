import { getHistoricalNav } from "./funds";
import { getFundInsights, FundInsights } from "./finapi";
import { fetchSchemeDetails } from "./mfapi";
import {
  computeMonthlyReturns,
  computeAnnualizedVolatility,
  computeSortinoRatio,
  computeMaxDrawdown,
  computeSharpeRatio,
  computeBetaAlphaRSquared,
  computeTreynorRatio,
  computeCompositeScore,
  computeHHI,
  computeSectorConcentration,
} from "./risk-calculations";

export interface RiskMetrics {
  volatility: number;
  maxDrawdown: number;
  maxDrawdownDuration: number;
  sharpeRatio: number;
  sortinoRatio: number;
  alpha: number;
  beta: number;
  rSquared: number;
  treynorRatio: number;
  concentrationRisk: number; // HHI Index
  sectorConcentration: number; // Top 3 sectors %
  compositeScore: number; // 0-100
}

export interface FundRiskAnalysis {
  schemeCode: string;
  schemeName: string;
  metrics: RiskMetrics;
  insights: FundInsights | null;
  fundManagerName: string | null;
  fundManagerTenure: string | null;
}

const BENCHMARK_SCHEME_CODE = "118531"; // Franklin India Large Cap Fund as proxy for Nifty 50 TRI

/**
 * Fetches ~`months` of NAV history sampled every 30 days, ordered newest-to-oldest
 * (index 0 = most recent). This ordering matters: computeMonthlyReturns() assumes
 * navs[i] is more recent than navs[i+1] — don't reverse this array.
 */
async function fetchMonthlyNavSeries(schemeCode: string, months: number): Promise<number[]> {
  const navs: number[] = [];
  for (let i = 0; i < months; i++) {
    const nav = await getHistoricalNav(schemeCode, i * 30);
    if (nav) navs.push(nav);
  }
  return navs;
}

/**
 * Computes risk metrics using the tested pure functions in risk-calculations.ts
 * (previously this logic was reimplemented inline here, untested, in parallel with
 * the tested versions — see audit report section 1.3/3.3) and returns the
 * FundInsights fetched along the way, so getFullRiskAnalysis doesn't need a second
 * call to getFundInsights() for the same scheme (see 1.4/3.5).
 */
async function computeRiskMetricsWithInsights(
  schemeCode: string
): Promise<{ metrics: RiskMetrics; insights: FundInsights | null } | null> {
  try {
    const [schemeNavs, benchmarkNavs] = await Promise.all([
      fetchMonthlyNavSeries(schemeCode, 36),
      fetchMonthlyNavSeries(BENCHMARK_SCHEME_CODE, 36),
    ]);

    if (schemeNavs.length < 10 || benchmarkNavs.length < 10) return null;

    const schemeReturns = computeMonthlyReturns(schemeNavs);
    const benchmarkReturns = computeMonthlyReturns(benchmarkNavs);

    const volatility = computeAnnualizedVolatility(schemeReturns);
    const sortinoRatio = computeSortinoRatio(schemeReturns);
    const { drawdown: maxDrawdown, duration: maxDrawdownDuration } = computeMaxDrawdown(schemeNavs);
    const sharpeRatio = computeSharpeRatio(schemeReturns);
    const { beta, alpha, rSquared } = computeBetaAlphaRSquared(schemeReturns, benchmarkReturns);
    const treynorRatio = computeTreynorRatio(schemeReturns, beta);

    const insights = await getFundInsights(schemeCode);
    const concentrationRisk = insights
      ? computeHHI(insights.holdings.map((h) => ({ allocation: h.allocation })))
      : 0;
    const sectorConcentration = insights ? computeSectorConcentration(insights.sectorAllocation) : 0;

    const compositeScore = computeCompositeScore({
      volatility, maxDrawdown, sharpeRatio, sortinoRatio, alpha, beta, rSquared,
    });

    const metrics: RiskMetrics = {
      volatility,
      maxDrawdown,
      maxDrawdownDuration,
      sharpeRatio,
      sortinoRatio,
      alpha,
      beta,
      rSquared,
      treynorRatio,
      concentrationRisk,
      sectorConcentration,
      compositeScore,
    };

    return { metrics, insights };
  } catch (error) {
    console.error(`Risk calculation error for ${schemeCode}:`, error);
    return null;
  }
}

export async function calculateRiskMetrics(schemeCode: string): Promise<RiskMetrics | null> {
  const result = await computeRiskMetricsWithInsights(schemeCode);
  return result?.metrics ?? null;
}

export async function getFullRiskAnalysis(schemeCode: string): Promise<FundRiskAnalysis | null> {
  try {
    const result = await computeRiskMetricsWithInsights(schemeCode);
    if (!result) return null;
    const { metrics, insights } = result;

    // Use the cached mfapi.in helper (fetchSchemeDetails already hits this exact
    // endpoint and caches the response) instead of a second, uncached raw fetch
    // just to read the scheme name.
    const details = await fetchSchemeDetails(schemeCode).catch(() => null);

    return {
      schemeCode,
      schemeName: details?.meta?.scheme_name || insights?.schemeName || "Unknown Fund",
      metrics,
      insights,
      fundManagerName: insights?.fundManager?.name || null,
      fundManagerTenure: insights?.fundManager?.tenure || null,
    };
  } catch (error) {
    console.error(`Full risk analysis error for ${schemeCode}:`, error);
    return null;
  }
}
