const { Pool } = require('pg');
require('dotenv').config();

async function testCagr() {
  // Test Case: Current NAV = 100, Past NAV = 50, Days = 365 (1 Year)
  // CAGR = ((100/50)^(1/1)) - 1 = 1.0 (100%)
  const test1 = calculateCAGR(100, 50, 365);
  console.log(`Test 1 (1Y): Expected 100%, Got ${test1}%`);

  // Test Case: Absolute Return (Short Term)
  // Current = 105, Past = 100, Days = 30
  // Return = (105/100) - 1 = 0.05 (5%)
  const test2 = calculateCAGR(105, 100, 30);
  console.log(`Test 2 (1M): Expected 5%, Got ${test2}%`);
}

// Mocking the calculateCAGR since this is a node script
function calculateCAGR(currentNav, pastNav, days) {
  if (!currentNav || !pastNav || days <= 0) return null;
  if (days < 365) return ((currentNav / pastNav) - 1) * 100;
  const years = days / 365;
  return (Math.pow(currentNav / pastNav, 1 / years) - 1) * 100;
}

testCagr();
