import { NextRequest, NextResponse } from "next/server";
import { getFundInsights } from "@/lib/finapi";
import { getHistoricalNav, calculateCAGR } from "@/lib/funds";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Scheme ID is required" }, { status: 400 });
    }

    const insights = await getFundInsights(id);

    if (!insights) {
      return NextResponse.json({ error: "Fund insights not found" }, { status: 404 });
    }

    // Calculate CAGR returns for 1Y, 3Y, 5Y (non-fatal if fails)
    let cagrReturns: Record<string, number | null> = {};
    try {
      const currentNav = await getHistoricalNav(id, 0);
      const pastNav1Y = currentNav ? await getHistoricalNav(id, 365) : null;
      const pastNav3Y = currentNav ? await getHistoricalNav(id, 1095) : null;
      const pastNav5Y = currentNav ? await getHistoricalNav(id, 1825) : null;

      cagrReturns = {
        '1Y': currentNav && pastNav1Y ? calculateCAGR(currentNav, pastNav1Y, 365) : null,
        '3Y': currentNav && pastNav3Y ? calculateCAGR(currentNav, pastNav3Y, 1095) : null,
        '5Y': currentNav && pastNav5Y ? calculateCAGR(currentNav, pastNav5Y, 1825) : null,
      };
    } catch (cagrError) {
      console.warn(`CAGR calculation failed for ${id}:`, cagrError);
    }

    return NextResponse.json({ ...insights, cagrReturns });
  } catch (error) {
    console.error("Fund Insights API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
