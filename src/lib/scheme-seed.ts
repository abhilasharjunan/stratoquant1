import { prisma } from "./prisma";
import { BENCHMARK_SCHEMES } from "./funds";

export async function seedSchemeCatalog() {
  const existing = await prisma.schemeCatalog.count();
  if (existing > 100) {
    console.log(`Scheme catalog already has ${existing} entries, skipping seed.`);
    return existing;
  }

  let count = 0;
  for (const scheme of BENCHMARK_SCHEMES) {
    await prisma.schemeCatalog.upsert({
      where: { schemeCode: scheme.schemeCode },
      update: { category: scheme.category },
      create: {
        schemeCode: scheme.schemeCode,
        schemeName: scheme.schemeName,
        category: scheme.category,
      },
    });
    count++;
  }

  console.log(`Seeded ${count} benchmark schemes into catalog.`);

  // Also populate from existing schemeMaster entries (user portfolios)
  const portfolioSchemes = await prisma.schemeMaster.findMany({
    select: { schemeCode: true, schemeName: true, category: true },
  });

  for (const s of portfolioSchemes) {
    await prisma.schemeCatalog.upsert({
      where: { schemeCode: s.schemeCode },
      update: {},
      create: {
        schemeCode: s.schemeCode,
        schemeName: s.schemeName,
        category: s.category,
      },
    });
    count++;
  }

  console.log(`Total: ${count} schemes in catalog.`);
  return count;
}
