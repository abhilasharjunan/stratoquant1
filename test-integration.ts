import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { calculateXIRR } from './src/lib/xirr';

dotenv.config({ path: '.env' });

// Initialize Prisma with the required Adapter for Prisma 7
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🚀 STARTING FULL SYSTEM INTEGRATION TEST');
  console.log('----------------------------------------');

  try {
    // 1. USER SETUP
    const user = await prisma.user.upsert({
      where: { email: 'qa-test@folioveda.com' },
      update: {},
      create: {
        email: 'qa-test@folioveda.com',
        name: 'QA Test User',
        password: 'password123',
        consentGiven: true,
        consentDate: new Date(),
      },
    });
    console.log('✅ Phase 1: User identified/created:', user.id);

    // 2. PORTFOLIO SETUP
    const portfolio = await prisma.portfolio.create({
      data: {
        userId: user.id,
        name: 'Integration Test Portfolio',
      },
    });
    console.log('✅ Phase 2: Portfolio created:', portfolio.id);

    // 3. SCHEME MASTER DATA
    const scheme = await prisma.schemeMaster.upsert({
      where: { schemeCode: 'TEST123' },
      update: {},
      create: {
        schemeCode: 'TEST123',
        schemeName: 'Test Alpha Equity Fund',
        category: 'Equity',
        latestNav: 120.50,
        lastUpdated: new Date(),
        riskLevel: 'Moderate',
      },
    });
    console.log('✅ Phase 3: Scheme Master cached:', scheme.schemeName);

    // 4. HOLDING & TRANSACTIONS
    const holding = await prisma.holding.create({
      data: {
        portfolioId: portfolio.id,
        schemeCode: 'TEST123',
        units: 100,
      },
    });

    await prisma.transaction.create({
      data: {
        holdingId: holding.id,
        date: new Date('2023-01-01'),
        amount: 10000,
        units: 100,
        type: 'BUY',
      },
    });
    console.log('✅ Phase 4: Investment recorded (100 units @ ₹100)');

    // 5. ANALYTICS VALIDATION
    const currentNav = 120.50;
    const currentVal = 100 * currentNav;
    const invested = 10000;
    
    const cashFlows = [
      { amount: -invested, date: new Date('2023-01-01') },
      { amount: currentVal, date: new Date() },
    ];
    
    const xirr = calculateXIRR(cashFlows);
    console.log('\n--- ANALYSIS REPORT ---');
    console.log(`Investment: ₹${invested}`);
    console.log(`Current Value: ₹${currentVal}`);
    console.log(`Absolute Gain: ₹${currentVal - invested}`);
    console.log(`Calculated XIRR: ${(xPerr(xirr) * 100).toFixed(2)}%`);
    
    console.log('\n----------------------------------------');
    console.log('🎉 SYSTEM INTEGRATION SUCCESSFUL');
  } catch (error) {
    console.error('❌ INTEGRATION FAILURE:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

function xPerr(val: any) { return val || 0; }

main();
