import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { calculatePortfolioOverlapMatrix } from "@/lib/overlap";

export const dynamic = 'force-dynamic';

// GET /api/portfolio/overlap
// Pairwise weighted overlap across every fund in the logged-in user's portfolio —
// powers a portfolio-wide overlap heatmap (audit report, Phase 4 item 9).
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const portfolio = await prisma.portfolio.findFirst({
      where: { userId: session.user.id },
      include: { holdings: { select: { schemeCode: true } } },
    });

    if (!portfolio || portfolio.holdings.length < 2) {
      return NextResponse.json({ pairs: [] });
    }

    const schemeCodes = portfolio.holdings.map((h) => h.schemeCode);
    const pairs = await calculatePortfolioOverlapMatrix(schemeCodes);

    return NextResponse.json({ pairs });
  } catch (error) {
    console.error("Portfolio overlap API error:", error);
    return NextResponse.json({ error: "Failed to calculate portfolio overlap" }, { status: 500 });
  }
}
