import { NextRequest, NextResponse } from "next/server";
import { BENCHMARK_SCHEMES, FundCategory } from "@/lib/funds";
import { getFundInsights } from "@/lib/finapi";
import { getHistoricalNav, calculateCAGR } from "@/lib/funds";
import { fetchSchemeDetails } from "@/lib/mfapi";
import { prisma } from "@/lib/prisma";
import redis from "@/lib/redis";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const codesParam = searchParams.get('codes');
    
    if (!codesParam) {
      return NextResponse.json({ error: "Missing 'codes' parameter" }, { status: 400 });
    }
    
    const codes = codesParam.split(',').map(code => code.trim()).filter(Boolean).sort();
    
    if (codes.length === 0) {
      return NextResponse.json({ error: "No valid codes provided" }, { status: 400 });
    }
    
    if (codes.length > 50) {
      return NextResponse.json({ error: "Maximum 50 codes per batch" }, { status: 400 });
    }

    const cacheKey = `funds:batch:${codes.join(',')}`;
    try {
      const cachedData = redis ? await redis.get(cacheKey) : null;
      if (cachedData) {
        return NextResponse.json(JSON.parse(cachedData));
      }
    } catch (redisErr) {
      console.warn("Redis cache read error:", redisErr);
    }

    // Fetch per-fund cached CAGR data from TopFundsCache (avoids external API calls)
    const cachedFunds = await prisma.topFundsCache.findMany({
      where: { schemeCode: { in: codes } },
      select: { schemeCode: true, returns: true, sinceInception: true },
    });
    const cachedCAGR = new Map(cachedFunds.map(c => [c.schemeCode, {
      '1Y': (c.returns as Record<string, number | null>)?.['1Y'] ?? null,
      '3Y': (c.returns as Record<string, number | null>)?.['3Y'] ?? null,
      '5Y': (c.returns as Record<string, number | null>)?.['5Y'] ?? null,
    }]));

    const overallController = new AbortController();
    const overallTimeout = setTimeout(() => overallController.abort(), 25000);

    try {
      const fundPromises = codes.map(async (code) => {
        const perFundCacheKey = `funds:single:${code}`;

        // 1. Check per-fund Redis cache
        if (redis) {
          try {
            const cached = await redis.get(perFundCacheKey);
            if (cached) return JSON.parse(cached);
          } catch {}
        }

        try {
          const scheme = await prisma.schemeMaster.findUnique({
            where: { schemeCode: code },
            select: {
              schemeCode: true, schemeName: true, category: true, fundHouse: true,
              latestNav: true, lastUpdated: true, riskLevel: true,
              volatility: true, sharpeRatio: true, sortinoRatio: true,
              maxDrawdown: true, maxDrawdownDuration: true,
              alpha: true, beta: true, rSquared: true, treynorRatio: true, riskScore: true,
              fundManagerName: true, fundManagerTenure: true,
            }
          });
          
          if (!scheme) {
            try {
              const details = await fetchSchemeDetails(code);
              if (details?.meta) {
                const fallbackNav = parseFloat(details.data?.[0]?.nav) || 0;
                const cagr = cachedCAGR.get(code) || { '1Y': null, '3Y': null, '5Y': null };
                const result = {
                  schemeCode: code,
                  schemeName: details.meta.scheme_name || `Scheme ${code}`,
                  category: 'Other',
                  fundHouse: details.meta.fund_house || 'N/A',
                  latestNav: fallbackNav,
                  lastUpdated: null, riskLevel: null,
                  volatility: 0, sharpeRatio: 0, sortinoRatio: 0,
                  maxDrawdown: 0, maxDrawdownDuration: 0,
                  alpha: 0, beta: 0, rSquared: 0, treynorRatio: 0, riskScore: 0,
                  fundManagerName: null, fundManagerTenure: null,
                  aum: 'N/A', expenseRatio: 'N/A', sectorAllocation: {}, holdings: [],
                  cagrReturns: cagr,
                  available: true
                };
                if (redis) await redis.set(perFundCacheKey, JSON.stringify(result), 'EX', 3600).catch(() => {});
                return result;
              }
            } catch (fallbackErr) {
              console.warn(`Fallback failed for ${code}:`, fallbackErr);
            }
            return { schemeCode: code, error: "Scheme not found in database", available: false };
          }
          
          let insights = null;
          try {
            insights = await getFundInsights(code);
          } catch (insightsError) {
            console.warn(`Failed to get insights for ${code}:`, insightsError);
          }

          // Use TopFundsCache CAGR if available, else compute from historical NAV
          let cagrReturns = cachedCAGR.get(code);
          if (!cagrReturns) {
            try {
              const currentNav = scheme.latestNav ? Number(scheme.latestNav) : await getHistoricalNav(code, 0);
              if (currentNav) {
                const [nav1Y, nav3Y, nav5Y] = await Promise.all([
                  getHistoricalNav(code, 365),
                  getHistoricalNav(code, 1095),
                  getHistoricalNav(code, 1825)
                ]);
                cagrReturns = {
                  '1Y': nav1Y ? calculateCAGR(currentNav, nav1Y, 365) : null,
                  '3Y': nav3Y ? calculateCAGR(currentNav, nav3Y, 1095) : null,
                  '5Y': nav5Y ? calculateCAGR(currentNav, nav5Y, 1825) : null,
                };
              }
            } catch (cagrErr) {
              console.warn(`CAGR calc failed for ${code}:`, cagrErr);
            }
          }
          cagrReturns = cagrReturns || { '1Y': null, '3Y': null, '5Y': null };
          
          const result = {
            schemeCode: scheme.schemeCode,
            schemeName: scheme.schemeName,
            category: scheme.category,
            fundHouse: scheme.fundHouse || (insights?.fundHouse || 'N/A'),
            latestNav: Number(scheme.latestNav || 0),
            lastUpdated: scheme.lastUpdated,
            riskLevel: scheme.riskLevel,
            volatility: Number(scheme.volatility || 0),
            sharpeRatio: Number(scheme.sharpeRatio || 0),
            sortinoRatio: Number(scheme.sortinoRatio || 0),
            maxDrawdown: Number(scheme.maxDrawdown || 0),
            maxDrawdownDuration: Number(scheme.maxDrawdownDuration || 0),
            alpha: Number(scheme.alpha || 0),
            beta: Number(scheme.beta || 0),
            rSquared: Number(scheme.rSquared || 0),
            treynorRatio: Number(scheme.treynorRatio || 0),
            riskScore: Number(scheme.riskScore || 0),
            fundManagerName: scheme.fundManagerName || null,
            fundManagerTenure: scheme.fundManagerTenure || null,
            aum: insights?.aum || 'N/A',
            expenseRatio: insights?.expenseRatio || 'N/A',
            sectorAllocation: insights?.sectorAllocation || {},
            holdings: insights?.holdings || [],
            cagrReturns,
            available: true
          };

          // Cache per-fund result in Redis
          if (redis) await redis.set(perFundCacheKey, JSON.stringify(result), 'EX', 3600).catch(() => {});
          
          return result;
        } catch (error) {
          console.error(`Error processing fund ${code}:`, error);
          return { schemeCode: code, error: "Failed to load fund data", available: false };
        }
      });
      
      const funds = await Promise.all(fundPromises);
      const availableFunds = funds.filter(f => f.available);
      const unavailableFunds = funds.filter(f => !f.available);
      
      const result = {
        funds: availableFunds,
        unavailable: unavailableFunds,
        total: codes.length,
        availableCount: availableFunds.length,
        unavailableCount: unavailableFunds.length
      };

      try {
        if (redis) await redis.set(cacheKey, JSON.stringify(result), 'EX', 3600);
      } catch (redisErr) {
        console.warn("Redis cache write error:", redisErr);
      }
      
      return NextResponse.json(result);
    } finally {
      clearTimeout(overallTimeout);
    }
  } catch (error) {
    console.error("Batch funds API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
