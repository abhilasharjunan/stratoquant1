import { NextRequest, NextResponse } from "next/server";
import { syncRiskMetrics } from "@/lib/risk-sync";

export async function GET(request: NextRequest) {
  try {
    // In production, you would verify a secret key here
    const count = await syncRiskMetrics();
    return NextResponse.json({ 
      success: true, 
      message: `Successfully updated risk metrics for ${count} schemes.` 
    });
  } catch (error) {
    console.error("Snyc Risk API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
