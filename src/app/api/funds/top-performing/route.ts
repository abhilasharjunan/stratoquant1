import { NextRequest, NextResponse } from "next/server";
import { BENCHMARK_SCHEMES, calculateCAGR, getHistoricalNav, FundCategory } from "@/lib/funds";

export const dynamic = 'force-dynamic';

export async function GET() {

  try {
    const results: Record<string, any[]> = {};
    const categories: FundCategory[] = [
      "Large Cap", "Mid Cap", "Small Cap", "Flexi Cap", "ELSS", "Debt", "Hybrid", "Index Funds", "International Funds"
    ];

    for (const cat of categories) {
      const schemes = BENCHMARK_SCHEMES.filter(s => s.category === cat);
      
      // Process in small batches to avoid overwhelming the connection pool
      const fundData: any[] = [];
      for (let i = 0; i < schemes.length; i += 3) {
        const batch = schemes.slice(i, i + 3);
        const results = await Promise.all(batch.map(async (scheme) => {
          try {
            const currentNav = await getHistoricalNav(scheme.schemeCode, 0);
            if (!currentNav) return null;

            const windows = {
              "1M": 30, "3M": 90, "6M": 180,
              "1Y": 365, "3Y": 3 * 365, "5Y": 5 * 365, "10Y": 10 * 365,
            };

            const returns: Record<string, number | null> = {};
            let oldestNav = currentNav;

            for (const [label, days] of Object.entries(windows)) {
              const pastNav = await getHistoricalNav(scheme.schemeCode, days);
              returns[label] = pastNav ? calculateCAGR(currentNav, pastNav, days) : null;
              if (pastNav && pastNav < oldestNav) oldestNav = pastNav;
            }

            const inceptionCagr = calculateCAGR(currentNav, oldestNav, 365 * 10);

            return {
              schemeCode: scheme.schemeCode,
              schemeName: scheme.schemeName,
              amc: "Mutual Fund",
              nav: currentNav,
              returns,
              sinceInception: inceptionCagr,
            };
          } catch (e) {
            console.error(`Error fetching ${scheme.schemeCode}:`, e);
            return null;
          }
        }));
        fundData.push(...results);
        // Small delay between batches
        await new Promise(r => setTimeout(r, 200));
      }

      results[cat] = (fundData.filter((f): f is NonNullable<typeof f> => f !== null) as any[])
        .sort((a: any, b: any) => (b.returns["3Y"] || 0) - (a.returns["3Y"] || 0))
        .slice(0, 10);
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Top Performing Funds API Error:", error);
    return NextResponse.json({ error: "Failed to fetch top funds" }, { status: 500 });
  }
}
