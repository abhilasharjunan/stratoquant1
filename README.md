<<<<<<< HEAD
# FolioVeda
Mutual Fund Portfolio Analyzer
=======
# FolioVeda - Modern Mutual Fund Portfolio Analyzer

A professional-grade, SEBI-compliant mutual fund portfolio tracker focusing on precision XIRR and high-end security.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL Database (Neon, Supabase, or Local)

### Installation
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Setup environment variables:
   ```bash
   cp .env.example .env
   ```
4. Initialize Database:
   ```bash
   npx prisma db push
   ```
5. Run the application:
   ```bash
   npm run dev
   ```

## 🛡️ Security Architecture
- **IDOR Protection**: All data access is scoped to the authenticated user via UUIDs and Prisma filters.
- **Input Validation**: Zod schemas enforce strict typing on all API inputs.
- **CSV Sanitization**: Using papaparse + Zod to prevent CSV injection.
- **Data Isolation**: Row-level security patterns implemented at the API layer.

## ⚖️ SEBI Compliance
- Persistent regulatory disclaimers in footer and dashboard.
- Standardized Risk-o-Meter for fund risk assessment.
- Explicit user consent flow for financial data storage.
- Transparent data attribution (AMFI/mfapi.in).

## 🛠️ Technical Stack
- **Frontend**: Next.js 15, Tailwind CSS, shadcn/ui, Recharts.
- **Backend**: Next.js API Routes, Prisma ORM.
- **Auth**: NextAuth.js (Google OAuth).
- **Calculations**: Newton-Raphson XIRR implementation.
- **Data**: mfapi.in for daily NAV updates.

## 📅 Daily NAV Sync
The system updates NAVs daily via a secure cron job:
`GET /api/cron/sync-nav?key=${CRON_SECRET}`
>>>>>>> dfc8173 (Initial commit: FolioVeda mutual fund analysis platform)
