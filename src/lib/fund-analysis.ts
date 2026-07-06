import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getFundInsights } from "@/lib/finapi";
import { getHistoricalNav, calculateCAGR } from "@/lib/funds";

export async function getFundAnalysis(schemeCode: string) {
  const session = await auth();
  if (!session?.user) return null;

  const scheme = await prisma.schemeMaster.findUnique({
    where: { schemeCode },
  });

  if (!scheme) return null;

  const insights = await getFundInsights(schemeCode);

  let cagr1Y: number | null = null;
  let cagr3Y: number | null = null;
  let cagr5Y: number | null = null;

  try {
    const currentNav = await getHistoricalNav(schemeCode, 0);
    if (currentNav) {
      const nav1Y = await getHistoricalNav(schemeCode, 365);
      const nav3Y = await getHistoricalNav(schemeCode, 1095);
      const nav5Y = await getHistoricalNav(schemeCode, 1825);
      cagr1Y = nav1Y ? calculateCAGR(currentNav, nav1Y, 365) : null;
      cagr3Y = nav3Y ? calculateCAGR(currentNav, nav3Y, 1095) : null;
      cagr5Y = nav5Y ? calculateCAGR(currentNav, nav5Y, 1825) : null;
    }
  } catch (e) {
    console.warn(`CAGR calc failed for ${schemeCode}:`, e);
  }

  const riskLevelMappings: Record<string, string> = {
    'Low': 'Low',
    'Low to Moderate': 'Low to Moderate',
    'Moderate': 'Moderate',
    'Moderate to High': 'Moderate to High',
    'High': 'High',
    'Very High': 'Very High',
  };

  return {
    schemeCode: scheme.schemeCode,
    schemeName: scheme.schemeName,
    category: scheme.category,
    fundHouse: scheme.fundHouse || insights?.fundHouse || 'N/A',
    latestNav: scheme.latestNav,
    lastUpdated: scheme.lastUpdated,
    riskLevel: riskLevelMappings[scheme.riskLevel || ''] || null,
    riskScore: scheme.riskScore,
    volatility: scheme.volatility,
    sharpeRatio: scheme.sharpeRatio,
    sortinoRatio: scheme.sortinoRatio,
    maxDrawdown: scheme.maxDrawdown,
    maxDrawdownDuration: scheme.maxDrawdownDuration,
    alpha: scheme.alpha,
    beta: scheme.beta,
    rSquared: scheme.rSquared,
    treynorRatio: scheme.treynorRatio,
    fundManagerName: scheme.fundManagerName || insights?.fundManager?.name || null,
    fundManagerTenure: scheme.fundManagerTenure || insights?.fundManager?.tenure || null,
    aum: insights?.aum || 'N/A',
    expenseRatio: insights?.expenseRatio || 'N/A',
    sectorAllocation: insights?.sectorAllocation || {},
    holdings: insights?.holdings || [],
    cagrReturns: {
      '1Y': cagr1Y,
      '3Y': cagr3Y,
      '5Y': cagr5Y,
    },
  };
}
