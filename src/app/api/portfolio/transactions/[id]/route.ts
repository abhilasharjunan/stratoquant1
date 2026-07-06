import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const tx = await prisma.transaction.findUnique({
    where: { id },
    include: { holding: { include: { portfolio: true } } },
  });

  if (!tx) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  if (tx.holding.portfolio.userId !== session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.$transaction(async (txn: any) => {
    const delta = tx.type === "BUY" ? -Number(tx.units) : Number(tx.units);
    await txn.holding.update({
      where: { id: tx.holdingId },
      data: { units: { increment: delta } },
    });
    await txn.transaction.delete({ where: { id: tx.id } });
  });

  const remaining = await prisma.transaction.count({ where: { holdingId: tx.holdingId } });
  if (remaining === 0) {
    await prisma.holding.delete({ where: { id: tx.holdingId } });
  }

  return NextResponse.json({ success: true });
}
