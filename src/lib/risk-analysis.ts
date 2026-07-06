import { getHistoricalNav, calculateCAGR } from "./funds";
import { getFundInsights, FundInsights } from "./finapi";

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

const RISK_FREE_RATE = 0.065; // 6.5% approx RBI rate
const BENCHMARK_SCHEME_CODE = "118531"; // Franklin India Large Cap Fund as proxy for Nifty 50 TRI

export async function calculateRiskMetrics(schemeCode: string): Promise<RiskMetrics | null> {
  try {
    // Fetch NAV data for 3 years to calculate volatility, drawdown, and other metrics
    // We'll sample monthly data for performance and stability
    const schemeNavs: number[] = [];
    const benchmarkNavs: number[] = [];
    
    for (let i = 0; i < 36; i++) {
      const schemeNav = await getHistoricalNav(schemeCode, i * 30);
      const benchmarkNav = await getHistoricalNav(BENCHMARK_SCHEME_CODE, i * 30);
      
      if (schemeNav) schemeNavs.push(schemeNav);
      if (benchmarkNav) benchmarkNavs.push(benchmarkNav);
    }

    if (schemeNavs.length < 10 || benchmarkNavs.length < 10) return null;

    // 1. Calculate Monthly Returns
    const schemeReturns: number[] = [];
    const benchmarkReturns: number[] = [];
    
    for (let i = 0; i < schemeNavs.length - 1; i++) {
      schemeReturns.push((schemeNavs[i] - schemeNavs[i + 1]) / schemeNavs[i + 1]);
      benchmarkReturns.push((benchmarkNavs[i] - benchmarkNavs[i + 1]) / benchmarkNavs[i + 1]);
    }

    // 2. Calculate basic statistics
    const schemeMean = schemeReturns.reduce((a, b) => a + b, 0) / schemeReturns.length;
    const benchmarkMean = benchmarkReturns.reduce((a, b) => a + b, 0) / benchmarkReturns.length;
    
    // 3. Volatility (Annualized Std Dev of returns)
    const schemeVariance = schemeReturns.reduce((a, b) => a + Math.pow(b - schemeMean, 2), 0) / schemeReturns.length;
    const volatility = Math.sqrt(schemeVariance) * Math.sqrt(12); // Annualized
    
    // 4. Downside Deviation (for Sortino ratio)
    const downsideReturns = schemeReturns.filter(r => r < RISK_FREE_RATE / 12);
    const downsideVariance = downsideReturns.reduce((a, b) => a + Math.pow(b - (RISK_FREE_RATE / 12), 2), 0) / downsideReturns.length;
    const downsideDeviation = Math.sqrt(downsideVariance) * Math.sqrt(12);
    const sortinoRatio = downsideDeviation > 0 ? ((schemeMean * 12) - RISK_FREE_RATE) / downsideDeviation : 0;
    
    // 5. Max Drawdown and Duration
    let peak = -Infinity;
    let peakIndex = 0;
    let maxDD = 0;
    let maxDDStart = 0;
    let maxDDEnd = 0;
    
    for (let i = 0; i < schemeNavs.length; i++) {
      const nav = schemeNavs[i];
      if (nav > peak) {
        peak = nav;
        peakIndex = i;
      }
      const dd = (peak - nav) / peak;
      if (dd > maxDD) {
        maxDD = dd;
        maxDDStart = peakIndex;
        maxDDEnd = i;
      }
    }
    
    const maxDrawdownDuration = maxDDEnd - maxDDStart; // in months
    
    // 6. Sharpe Ratio
    const avgReturn = schemeMean * 12;
    const sharpeRatio = (avgReturn - RISK_FREE_RATE) / volatility;
    
    // 7. Beta, Alpha, R-squared vs Benchmark
    // Beta = Covariance(Rp, Rb) / Variance(Rb)
    const covariance = schemeReturns.reduce((acc, ret, idx) => {
      return acc + (ret - schemeMean) * (benchmarkReturns[idx] - benchmarkMean);
    }, 0) / schemeReturns.length;
    
    const benchmarkVariance = benchmarkReturns.reduce((a, b) => a + Math.pow(b - benchmarkMean, 2), 0) / benchmarkReturns.length;
    const beta = benchmarkVariance !== 0 ? covariance / benchmarkVariance : 1;
    
    // Alpha = Rp - [Rf + Beta*(Rb - Rf)]
    const avgBenchmarkReturn = benchmarkMean * 12;
    const alpha = avgReturn - (RISK_FREE_RATE + beta * (avgBenchmarkReturn - RISK_FREE_RATE));
    
    // R-squared
    const totalSumSquares = schemeReturns.reduce((acc, ret) => acc + Math.pow(ret - schemeMean, 2), 0);
    const residualSumSquares = schemeReturns.reduce((acc, ret, idx) => {
      const predicted = schemeMean + beta * (benchmarkReturns[idx] - benchmarkMean);
      return acc + Math.pow(ret - predicted, 2);
    }, 0);
    const rSquared = totalSumSquares !== 0 ? 1 - (residualSumSquares / totalSumSquares) : 0;
    
    // 8. Treynor Ratio = (Rp - Rf) / Beta
    const treynorRatio = beta !== 0 ? (avgReturn - RISK_FREE_RATE) / beta : 0;
    
    // 9. Portfolio Metrics (from FinAPI)
    const insights = await getFundInsights(schemeCode);
    let hhi = 0;
    let sectorConc = 0;
    let fundManagerName = null;
    let fundManagerTenure = null;

    if (insights) {
      // HHI = sum of squared weights
      hhi = insights.holdings.reduce((sum, h) => sum + Math.pow(h.allocation, 2), 0);
      
      // Sector Concentration (Top 3 sectors)
      const sortedSectors = Object.entries(insights.sectorAllocation)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .reduce((sum, [, val]) => sum + val, 0);
      sectorConc = sortedSectors;
      
      // Fund Manager Info (if available)
      fundManagerName = insights.fundManager?.name || null;
      fundManagerTenure = insights.fundManager?.tenure || null;
    }

    // 10. Composite Score (0-100)
    // Weights: Volatility(25%), MaxDD(20%), Sharpe(20%), Sortino(15%), Alpha(10%), Beta(5%), R-squared(5%)
    const normVol = Math.min(volatility * 200, 100); // Cap at 100
    const normDD = Math.min(maxDD * 200, 100);
    const normSharpe = Math.max(0, Math.min(sharpeRatio * 25, 100)); // Sharpe 0-4 -> 0-100
    const normSortino = Math.max(0, Math.min(sortinoRatio * 25, 100)); // Sortino 0-4 -> 0-100
    const normAlpha = Math.max(0, Math.min((alpha + 0.1) * 250, 100)); // Alpha -0.1 to 0.3 -> 0-100
    const normBeta = Math.max(0, Math.min((2 - Math.abs(beta - 1)) * 50, 100)); // Beta 0-2 -> 100-0 (closer to 1 is better)
    const normRSquared = Math.min(rSquared * 100, 100); // R-squared 0-1 -> 0-100
    
    const compositeScore = (normVol * 0.25) + (normDD * 0.2) + (normSharpe * 0.2) + (normSortino * 0.15) + (normAlpha * 0.1) + (normBeta * 0.05) + (normRSquared * 0.05);

    return {
      volatility,
      maxDrawdown: maxDD,
      maxDrawdownDuration: maxDrawdownDuration,
      sharpeRatio,
      sortinoRatio,
      alpha,
      beta,
      rSquared,
      treynorRatio,
      concentrationRisk: hhi,
      sectorConcentration: sectorConc,
      compositeScore
    };
  } catch (error) {
    console.error(`Risk calculation error for ${schemeCode}:`, error);
    return null;
  }
}

export async function getFullRiskAnalysis(schemeCode: string): Promise<FundRiskAnalysis | null> {
  try {
    const metrics = await calculateRiskMetrics(schemeCode);
    if (!metrics) return null;

    const insights = await getFundInsights(schemeCode);
    
    // Fetch basic name from mfapi since we need it for the UI
    // In a real app we'd use a database cache
    const details = await (async () => {
      try {
        const res = await fetch(`https://api.mfapi.in/mf/${schemeCode}`);
        const json = await res.json();
        return json.meta;
      } catch { return null; }
    })();

    return {
      schemeCode,
      schemeName: details?.scheme_name || "Unknown Fund",
      metrics,
      insights,
      fundManagerName: insights?.fundManager?.name || null,
      fundManagerTenure: insights?.fundManager?.tenure || null
    };
  } catch (error) {
    console.error(`Full risk analysis error for ${schemeCode}:`, error);
    return null;
  }
}
