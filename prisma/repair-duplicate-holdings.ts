/**
 * One-off data repair script for the import upsert bug (see FolioVeda_Audit_and_Roadmap.md, 1.1/3.1).
 *
 * Before the fix, every CSV/CAS import row created a brand-new Holding instead of
 * accumulating onto an existing one for the same (portfolioId, schemeCode). This
 * script finds those duplicate groups, merges them into a single surviving Holding
 * (units summed, earliest id kept), re-points every Transaction onto the survivor,
 * and deletes the now-empty duplicates.
 *
 * Run this BEFORE applying the `@@unique([portfolioId, schemeCode])` migration —
 * the migration will fail if duplicates still exist.
 *
 * Usage:
 *   npx tsx prisma/repair-duplicate-holdings.ts            # dry run, prints what it would do
 *   npx tsx prisma/repair-duplicate-holdings.ts --apply     # actually performs the merge
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const APPLY = process.argv.includes('--apply');

async function main() {
  console.log(APPLY ? 'Running in APPLY mode — changes will be written.' : 'Running in DRY RUN mode — pass --apply to write changes.');

  const holdings = await prisma.holding.findMany({
    select: { id: true, portfolioId: true, schemeCode: true, units: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  const groups = new Map<string, typeof holdings>();
  for (const h of holdings) {
    const key = `${h.portfolioId}::${h.schemeCode}`;
    const arr = groups.get(key) ?? [];
    arr.push(h);
    groups.set(key, arr);
  }

  const duplicateGroups = [...groups.values()].filter((g) => g.length > 1);

  if (duplicateGroups.length === 0) {
    console.log('No duplicate (portfolioId, schemeCode) holdings found. Safe to run the migration.');
    return;
  }

  console.log(`Found ${duplicateGroups.length} duplicate group(s) across ${duplicateGroups.reduce((s, g) => s + g.length, 0)} holding rows.\n`);

  let mergedGroups = 0;
  let deletedRows = 0;
  let movedTransactions = 0;

  for (const group of duplicateGroups) {
    const [survivor, ...duplicates] = group; // oldest row wins as the surviving id
    const totalUnits = group.reduce((sum, h) => sum + Number(h.units), 0);

    console.log(
      `Portfolio ${survivor.portfolioId} / scheme ${survivor.schemeCode}: ` +
      `merging ${group.length} rows (units ${group.map((h) => Number(h.units)).join(' + ')} = ${totalUnits}) into holding ${survivor.id}`
    );

    if (APPLY) {
      await prisma.$transaction(async (tx) => {
        for (const dup of duplicates) {
          const moved = await tx.transaction.updateMany({
            where: { holdingId: dup.id },
            data: { holdingId: survivor.id },
          });
          movedTransactions += moved.count;
        }

        await tx.holding.update({
          where: { id: survivor.id },
          data: { units: totalUnits },
        });

        const del = await tx.holding.deleteMany({
          where: { id: { in: duplicates.map((d) => d.id) } },
        });
        deletedRows += del.count;
      });
    }

    mergedGroups++;
  }

  console.log(`\n${APPLY ? 'Done.' : 'Dry run complete.'} ${mergedGroups} group(s) would be merged` +
    (APPLY ? `; ${deletedRows} duplicate row(s) deleted, ${movedTransactions} transaction(s) re-pointed.` : '.'));

  if (!APPLY) {
    console.log('Re-run with --apply to perform the merge, then run `npx prisma migrate dev` to add the unique constraint.');
  }
}

main()
  .catch((e) => {
    console.error('Repair script error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
