import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function viewData() {
  console.log('📊 DATABASE CONTENTS');
  console.log('====================\n');

  // Users
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, createdAt: true }
  });
  console.log('👤 USERS:', users.length);
  users.forEach(u => console.log(`  - ${u.email} (${u.name}) - ${u.id}`));

  // Portfolios
  const portfolios = await prisma.portfolio.findMany({
    include: { user: { select: { email: true } } }
  });
  console.log('\n📁 PORTFOLIOS:', portfolios.length);
  portfolios.forEach(p => console.log(`  - ${p.name} (User: ${p.user.email}) - ${p.id}`));

  // Holdings
  const holdings = await prisma.holding.findMany({
    include: { 
      portfolio: { select: { name: true } },
      transactions: true
    }
  });
  console.log('\n📦 HOLDINGS:', holdings.length);
  holdings.forEach(h => {
    console.log(`  - ${h.schemeCode}: ${h.units} units (Portfolio: ${h.portfolio.name})`);
    h.transactions.forEach(t => {
      console.log(`    💰 ${t.type}: ${t.units} units @ ₹${t.amount} on ${t.date.toISOString().split('T')[0]}`);
    });
  });

  // Schemes
  const schemes = await prisma.schemeMaster.findMany();
  console.log('\n📋 SCHEME MASTER:', schemes.length);
  schemes.forEach(s => {
    console.log(`  - ${s.schemeCode}: ${s.schemeName} (NAV: ₹${s.latestNav}, Category: ${s.category})`);
  });

  await prisma.$disconnect();
}

viewData().catch(console.error);
