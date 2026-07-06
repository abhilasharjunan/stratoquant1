import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

interface Holding {
  schemeCode: string;
  units: any;
}

export async function getPortfolioDiversification() {
  // During build, return mock data to avoid Prisma initialization
  if (!process.env.DATABASE_URL) {
    return {
      distribution: [
        { name: 'Equity', percentage: 65.5 },
        { name: 'Debt', percentage: 25.2 },
        { name: 'Hybrid', percentage: 9.3 },
      ],
      score: 75,
      riskLevel: 'Moderate Concentration'
    };
  }

  const session = await auth();
  if (!session?.user) return null;

  const holdings = await prisma.holding.findMany({
    where: {
      portfolio: { userId: session.user.id }
    },
  }) as Array<{ schemeCode: string; units: any }>;

  if (holdings.length === 0) return null;

  // Fetch scheme details for all unique scheme codes
  const schemeCodes = [...new Set(holdings.map((h: Holding) => h.schemeCode))];
  const schemes = await prisma.schemeMaster.findMany({
    where: {
      schemeCode: { in: schemeCodes }
    },
    select: { schemeCode: true, category: true }
  }) as Array<{ schemeCode: string; category: string | null }>;

  const schemeMap = new Map(schemes.map(s => [s.schemeCode, s.category || "Unknown"]));

  const categoryMap: Record<string, number> = {};
  let totalUnits = 0;

  holdings.forEach((h: Holding) => {
    const cat = schemeMap.get(h.schemeCode) || "Unknown";
    const units = Number(h.units);
    categoryMap[cat] = (categoryMap[cat] || 0) + units;
    totalUnits += units;
  });

  const distribution = Object.entries(categoryMap).map(([name, value]) => ({
    name,
    percentage: (value / totalUnits) * 100
  }));

  // Scoring Logic: Simple concentration check
  // Score decreases if any single category > 70%
  let score = 100;
  distribution.forEach(d => {
    if (d.percentage > 70) score -= 30;
    else if (d.percentage > 50) score -= 10;
  });

  return {
    distribution,
    score: Math.max(score, 40), // Minimum score 40
    riskLevel: score > 80 ? 'Well Diversified' : score > 60 ? 'Moderate Concentration' : 'High Concentration'
  };
}
