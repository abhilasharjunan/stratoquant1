import { NextResponse } from "next/server";
import { getPortfolioRiskAnalysis } from "@/lib/portfolio-risk";

export async function GET() {
  try {
    const analysis = await getPortfolioRiskAnalysis();
    if (!analysis) {
      return new NextResponse("No portfolio data available", { status: 404 });
    }

    const escapeCsv = (v: unknown) => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    const rows = [['Fund', 'Category', 'Value', 'Weight %', 'Volatility %', 'Risk Score'].join(',')];
    analysis.holdings.forEach((h: any) => {
      const weight = ((h.currentValue / analysis.totalValue) * 100).toFixed(2);
      rows.push([
        escapeCsv(h.schemeName),
        escapeCsv(h.category),
        `₹${Number(h.currentValue).toLocaleString('en-IN')}`,
        `${weight}%`,
        `${(h.volatility * 100).toFixed(2)}%`,
        h.riskScore.toFixed(1),
      ].join(','));
    });

    const csv = rows.join('\r\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv;charset=utf-8',
        'Content-Disposition': 'attachment; filename="portfolio-risk-analysis.csv"',
      },
    });
  } catch (error) {
    console.error("Portfolio export error:", error);
    return new NextResponse("Export failed", { status: 500 });
  }
}
