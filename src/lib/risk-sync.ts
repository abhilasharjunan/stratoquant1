import { prisma } from "@/lib/prisma";
import { calculateRiskMetrics } from "./risk-analysis";
import { BENCHMARK_SCHEMES } from "./funds";

export async function syncRiskMetrics() {
  console.log("Starting risk metrics synchronization...");
  let updatedCount = 0;

  for (const scheme of BENCHMARK_SCHEMES) {
    try {
      const metrics = await calculateRiskMetrics(scheme.schemeCode);
      if (metrics) {
        await prisma.schemeMaster.upsert({
          where: { schemeCode: scheme.schemeCode },
          update: {
            volatility: metrics.volatility,
            sharpeRatio: metrics.sharpeRatio,
            maxDrawdown: metrics.maxDrawdown,
            riskScore: metrics.compositeScore,
          },
          create: {
            schemeCode: scheme.schemeCode,
            schemeName: scheme.schemeName,
            category: scheme.category,
            latestNav: 0,
            volatility: metrics.volatility,
            sharpeRatio: metrics.sharpeRatio,
            maxDrawdown: metrics.maxDrawdown,
            riskScore: metrics.compositeScore,
          },
        });
        updatedCount++;
      }
    } catch (error) {
      console.error(`Failed to sync risk for ${scheme.schemeCode}:`, error);
    }
  }
  console.log(`Risk synchronization complete. Updated ${updatedCount} schemes.`);
  return updatedCount;
}

