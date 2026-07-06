import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const holding = await prisma.holding.findUnique({ where: { id } });
  if (!holding) {
    return NextResponse.json({ error: "Holding not found" }, { status: 404 });
  }

  const portfolio = await prisma.portfolio.findFirst({ where: { id: holding.portfolioId, userId: session.user.id } });
  if (!portfolio) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.holding.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
