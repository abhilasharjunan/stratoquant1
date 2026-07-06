import { NextRequest, NextResponse } from "next/server";
import { seedSchemeCatalog } from "@/lib/scheme-seed";

export async function GET() {
  try {
    const count = await seedSchemeCatalog();
    return NextResponse.json({ success: true, message: `Catalog seeded with ${count} schemes.` });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: "Seed failed" }, { status: 500 });
  }
}
