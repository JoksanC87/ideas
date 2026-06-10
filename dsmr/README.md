# Design System Maturity Radar (DSMR)

A production-quality multi-tenant SaaS platform for evaluating the maturity of Design Systems in enterprise companies.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL via Prisma ORM 7
- **Auth**: Supabase Auth (magic link)
- **AI**: Anthropic Claude (evidence analysis + AI evaluation gate)
- **Storage**: Google Cloud Storage (evidence file uploads)
- **Validation**: Zod
- **Charts**: Recharts

## Architecture

- Multi-tenant via Row-Level Security (RLS) in PostgreSQL
- 177 assessment questions across 10 maturity dimensions (A–J)
- AI-assisted evaluation gate: AI evaluates before human closes assessment
- Evidence hub: URL, file upload, integration signals
- Custom maturity model builder (clone/edit dimensions and questions)

## Setup

### 1. Prerequisites

- Node.js 20+
- PostgreSQL (or Supabase project)
- Supabase project for auth
- (Optional) Anthropic API key for AI features
- (Optional) Google Cloud Storage bucket for file uploads

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:

```env
DATABASE_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres?schema=public&sslmode=require"
NEXT_PUBLIC_SUPABASE_URL="https://[project-ref].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[your-anon-key]"
ANTHROPIC_API_KEY="sk-ant-..."
AI_MODEL="claude-sonnet-4-6"
GCS_BUCKET="dsmr-evidence"
DEMO_EMAIL="admin@demo.com"
```

### 4. Generate Prisma client

```bash
npx prisma generate
```

### 5. Run database migrations

```bash
npx prisma migrate deploy
```

Or for development with auto-migration:

```bash
npx prisma migrate dev
```

### 6. Seed the database

```bash
npx prisma db seed
```

This creates:
- A demo organization
- The DSMR Maturity Model v1 with all 177 questions
- Two demo companies (NeoBank Global, Banco Continental)
- A demo admin user (set DEMO_EMAIL in .env.local)

### 7. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
  app/
    (app)/              # Protected app routes (requires auth)
      layout.tsx        # App shell with nav + OrgSwitcher
      page.tsx          # Main dashboard (redirects to DesignSystemMaturityRadar)
      builder/          # Maturity model builder
    api/                # API routes
      assessments/      # CRUD + responses + AI evaluate + close
      companies/        # Company management
      evidence/         # Evidence hub (CRUD + signed upload URLs)
      me/               # Current user info
      models/           # Maturity model CRUD + questions
      overview/         # Dashboard overview data
      session/org/      # Active org switching
    auth/callback/      # Supabase auth callback
    login/              # Magic link login page
  components/
    DesignSystemMaturityRadar.tsx  # Main dashboard component
    EvidenceHub.tsx                # Evidence management UI
    AiGatePanel.tsx                # AI evaluation gate UI
    ModelBuilder.tsx               # Custom model builder UI
    OrgSwitcher.tsx                # Multi-org switcher
    ui/index.tsx                   # Design tokens + shared components
  data/
    questions.ts        # 177 assessment questions (static bank)
  lib/
    ai-evaluator.ts     # Anthropic AI evidence analysis
    answers.ts          # Answer type mapping (DB columns ↔ client)
    auth.ts             # Auth context + RBAC permissions
    data-layer.ts       # Frontend API client
    db.ts               # Prisma client + RLS tenant helpers
    evidence-signals.ts # Heuristic evidence signal analysis
    model-loader.ts     # Load scoring model from DB
    recommendations.ts  # Recommendation generation engine
    recompute.ts        # Score recomputation
    schemas.ts          # Zod validation schemas
    scoring.ts          # Maturity scoring engine
    storage.ts          # GCS storage helpers
    supabase/
      client.ts         # Browser Supabase client
      middleware.ts     # Session refresh middleware helper
      server.ts         # Server-side Supabase client
  middleware.ts         # Next.js middleware (auth guard)
prisma/
  schema.prisma         # Database schema
  seed.ts               # Database seed script
  migrations/           # SQL migrations (RLS setup)
```

## Maturity Dimensions

| Code | Dimension |
|------|-----------|
| A | Foundations & Governance |
| B | Components & Patterns |
| C | Documentation & Communication |
| D | Tooling & Infrastructure |
| E | Design Tokens |
| F | Accessibility |
| G | Testing & Quality |
| H | Adoption & Metrics |
| I | Contribution & Evolution |
| J | AI & Automation |

## Roles & Permissions

| Role | Capabilities |
|------|-------------|
| SUPER_ADMIN | Full access |
| ORG_ADMIN | All org operations including company/model management |
| DS_LEAD | Assessment write, close, AI evaluate |
| DESIGNOPS | Read + respond |
| DESIGNER | Read + respond |
| ENGINEER | Read + respond |
| PM | Read only |
| AUDITOR | Read + respond + validate evidence |

## Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint
npm run db:seed      # Seed database
npm run db:migrate   # Run migrations (dev)
npm run db:generate  # Regenerate Prisma client
```
