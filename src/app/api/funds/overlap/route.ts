import { NextRequest, NextResponse } from "next/server";
import { calculateFundOverlap } from "@/lib/overlap";

export const dynamic = 'force-dynamic';

// GET /api/funds/overlap?a=<schemeCodeA>&b=<schemeCodeB>
// Weighted overlap between two funds' top disclosed holdings (MIN-weight method).
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const a = searchParams.get("a");
    const b = searchParams.get("b");

    if (!a || !b) {
      return NextResponse.json({ error: "Both 'a' and 'b' scheme codes are required" }, { status: 400 });
    }
    if (a === b) {
      return NextResponse.json({ error: "Cannot compare a fund with itself" }, { status: 400 });
    }

    const result = await calculateFundOverlap(a, b);
    if (!result) {
      return NextResponse.json(
        { error: "Holdings data unavailable for one or both schemes" },
        { status: 503 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Fund overlap API error:", error);
    return NextResponse.json({ error: "Failed to calculate overlap" }, { status: 500 });
  }
}
