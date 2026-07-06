import { NextRequest, NextResponse } from "next/server";
import { BENCHMARK_SCHEMES, FundCategory } from "@/lib/funds";
import { getFundInsights } from "@/lib/finapi";
import { getHistoricalNav, calculateCAGR } from "@/lib/funds";
import { prisma } from "@/lib/prisma";
import redis from "@/lib/redis";

// Mark this route as dynamic to avoid static generation errors due to request.url usage
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
    
    // Limit batch size to prevent abuse
    if (codes.length > 50) {
      return NextResponse.json({ error: "Maximum 50 codes per batch" }, { status: 400 });
    }

    // Redis Caching
    const cacheKey = `funds:batch:${codes.join(',')}`;
    try {
      const cachedData = redis ? await redis.get(cacheKey) : null;
      if (cachedData) {
        return NextResponse.json(JSON.parse(cachedData));
      }
    } catch (redisErr) {
      console.warn("Redis cache read error:", redisErr);
    }
    
    // Process all funds in parallel with individual error handling
    const fundPromises = codes.map(async (code) => {
      try {
        // Get basic scheme info from database
        const scheme = await prisma.schemeMaster.findUnique({
          where: { schemeCode: code },
          select: {
            schemeCode: true,
            schemeName: true,
            category: true,
            fundHouse: true,
            latestNav: true,
            lastUpdated: true,
            riskLevel: true,
            volatility: true,
            sharpeRatio: true,
            sortinoRatio: true,
            maxDrawdown: true,
            maxDrawdownDuration: true,
            alpha: true,
            beta: true,
            rSquared: true,
            treynorRatio: true,
            riskScore: true,
          }
        });
        
        if (!scheme) {
          return {
            schemeCode: code,
            error: "Scheme not found in database",
            available: false
          };
        }
        
        // Try to get enhanced insights
        let insights = null;
        let cagrReturns_1Y: number | null = null;
        let cagrReturns_3Y: number | null = null;
        let cagrReturns_5Y: number | null = null;
        
        try {
          insights = await getFundInsights(code);
          
          // Calculate CAGR if we have insights (which means we got ISIN)
          if (insights) {
            const currentNav = await getHistoricalNav(code, 0);
            if (currentNav) {
              const [nav1Y, nav3Y, nav5Y] = await Promise.all([
                getHistoricalNav(code, 365),
                getHistoricalNav(code, 1095),
                getHistoricalNav(code, 1825)
              ]);
              cagrReturns_1Y = nav1Y ? calculateCAGR(currentNav, nav1Y, 365) : null;
              cagrReturns_3Y = nav3Y ? calculateCAGR(currentNav, nav3Y, 1095) : null;
              cagrReturns_5Y = nav5Y ? calculateCAGR(currentNav, nav5Y, 1825) : null;
            }
          }
        } catch (insightsError) {
          console.warn(`Failed to get insights for ${code}:`, insightsError);
          // Continue with basic data only
        }
        
            return {
              schemeCode: scheme.schemeCode,
              schemeName: scheme.schemeName,
              category: scheme.category,
              fundHouse: scheme.fundHouse || (insights?.fundHouse || 'N/A'),
              latestNav: Number(scheme.latestNav),
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
              aum: insights?.aum || 'N/A',
              expenseRatio: insights?.expenseRatio || 'N/A',
              sectorAllocation: insights?.sectorAllocation || {},
              holdings: insights?.holdings || [],
              cagrReturns: { '1Y': cagrReturns_1Y, '3Y': cagrReturns_3Y, '5Y': cagrReturns_5Y },
              available: true
            };
      } catch (error) {
        console.error(`Error processing fund ${code}:`, error);
        return {
          schemeCode: code,
          error: "Failed to load fund data",
          available: false
        };
      }
    });
    
    const funds = await Promise.all(fundPromises);
    
    // Separate available and unavailable funds
    const availableFunds = funds.filter(f => f.available);
    const unavailableFunds = funds.filter(f => !f.available);
    
    const result = {
      funds: availableFunds,
      unavailable: unavailableFunds,
      total: codes.length,
      availableCount: availableFunds.length,
      unavailableCount: unavailableFunds.length
    };

    // Cache the result for 1 hour
    try {
      if (redis) await redis.set(cacheKey, JSON.stringify(result), 'EX', 3600);
    } catch (redisErr) {
      console.warn("Redis cache write error:", redisErr);
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error("Batch funds API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
