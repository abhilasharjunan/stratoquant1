import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import redis from "@/lib/redis";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  try {
    // Redis Caching
    const cacheKey = `search:${query.toLowerCase()}`;
    try {
      const cachedData = redis ? await redis.get(cacheKey) : null;
      if (cachedData) {
        return NextResponse.json(JSON.parse(cachedData));
      }
    } catch (redisErr) {
      console.warn("Redis cache read error:", redisErr);
    }

    const localResults = await prisma.schemeCatalog.findMany({
      where: {
        schemeName: { contains: query, mode: "insensitive" },
      },
      take: 10,
      select: { schemeCode: true, schemeName: true },
    });

    if (localResults.length >= 10) {
      return NextResponse.json(localResults);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);

    const response = await fetch(
      `https://api.mfapi.in/mf/search?q=${encodeURIComponent(query)}`,
      { signal: controller.signal }
    );
    clearTimeout(timer);

    if (!response.ok) {
      return NextResponse.json(localResults);
    }

    const remoteData = await response.json();
    const remoteResults = (remoteData as Array<{ schemeCode: number | string; schemeName: string }>)
      .map(item => ({
        schemeCode: String(item.schemeCode),
        schemeName: item.schemeName,
      }));

    for (const item of remoteResults) {
      prisma.schemeCatalog.upsert({
        where: { schemeCode: item.schemeCode },
        update: { schemeName: item.schemeName },
        create: {
          schemeCode: item.schemeCode,
          schemeName: item.schemeName,
        },
      }).catch(() => {});
    }

    const remoteCodes = new Set(remoteResults.map(r => r.schemeCode));
    const merged = [
      ...remoteResults,
      ...localResults.filter(l => !remoteCodes.has(l.schemeCode)),
    ].slice(0, 10);

    // Cache the result for 1 hour
    try {
      if (redis) await redis.set(cacheKey, JSON.stringify(merged), 'EX', 3600);
    } catch (redisErr) {
      console.warn("Redis cache write error:", redisErr);
    }

    return NextResponse.json(merged);
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json([]);
  }
}
