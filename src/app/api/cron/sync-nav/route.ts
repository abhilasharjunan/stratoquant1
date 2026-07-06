import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchSchemeDetails } from "@/lib/mfapi";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // 1. Security: Verify Cron Secret
  const { searchParams } = new URL(req.url);
  const cronSecret = searchParams.get("key");
  
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 2. Identify all unique schemes currently held by users
    const activeSchemes = await prisma.holding.findMany({
      select: { schemeCode: true },
      distinct: ['schemeCode'],
    });

    const results = {
      updated: 0,
      failed: 0,
      schemes: [] as string[],
    };

    // 3. Fetch latest NAVs and update SchemeMaster
    for (const item of activeSchemes) {
      try {
        const data = await fetchSchemeDetails(item.schemeCode);
        const latestNav = data.data[0].nav;

        await prisma.schemeMaster.upsert({
          where: { schemeCode: item.schemeCode },
          update: {
            latestNav: parseFloat(latestNav),
            lastUpdated: new Date(),
          },
          create: {
            schemeCode: item.schemeCode,
            schemeName: data.mutualFund,
            latestNav: parseFloat(latestNav),
            // Category and RiskLevel would be fetched from a secondary mapping or manual entry
          },
        });
        
        results.updated++;
        results.schemes.push(item.schemeCode);
      } catch (e) {
        console.error(`Failed to sync ${item.schemeCode}:`, e);
        results.failed++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      ...results,
      timestamp: new Date().toISOString() 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
