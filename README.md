# RUIKD Overseas Sales Follow-up Manager

Production-quality MVP for an overseas sales director managing global aesthetic medical device opportunities.

## Stack
- Next.js App Router + TypeScript
- Tailwind CSS + shadcn-style UI components
- Prisma ORM
- SQLite (default for local) and PostgreSQL-ready via env

## Core pages
- `/login`
- `/dashboard`
- `/leads`
- `/companies`
- `/leads/[id]`
- `/followups`
- `/templates`
- `/prices`
- `/settings`

## Features implemented
- Dashboard with: overdue, today follow-ups, stage/country/product summaries, recent activities, quotation and negotiation alerts.
- Lead + company/contact management with export-sales specific fields.
- Pipeline stages: New Lead, Contacted, Waiting Reply, Negotiation, Quoted, Closed Won, Closed Lost, Dormant.
- Multi-product tagging for core device lineup.
- Communication timeline with multiple log categories and required metadata.
- Dedicated follow-up queue grouped by no-reply windows and stalled states.
- AI service abstraction (mock) for timeline summary, next-action recommendation, and draft generation.
- Draft manager for email/WhatsApp style content (editable, never auto-send).
- Price template manager with global / market / special scopes + CRUD editing workflow.
- CSV/XLSX export routes for leads, contacts, follow-up queue, quotations summary.
- Placeholder API routes for future Gmail/Calendar integration.
- Attachment upload scaffolding for brochure/quotation files with metadata linked to each lead.
- Seed data: 10 companies, 12 contacts, 20 leads with mixed stages and realistic international workflow examples.

## Local setup

### 1) Install dependencies
```bash
npm install
```

### 2) Prepare environment
```bash
cp .env.example .env
```

Set these values in `.env`:
```env
DATABASE_PROVIDER="sqlite"
DATABASE_URL="file:./dev.db"
ADMIN_EMAIL="admin@ruikd.local"
ADMIN_PASSWORD="admin1234"
SESSION_SECRET="replace-with-random-long-string"
```

For PostgreSQL:
```env
DATABASE_PROVIDER="postgresql"
DATABASE_URL="postgresql://user:password@localhost:5432/ruikd_followup"
```

### 3) Generate DB + seed
```bash
npm run db:generate
npm run db:push
npm run db:seed
```

### 4) Run app
```bash
npm run dev
```

Open `http://localhost:3000`.

## Export endpoints
- `/api/export/leads?format=csv`
- `/api/export/leads?format=xlsx`
- `/api/export/contacts?format=csv`
- `/api/export/contacts?format=xlsx`
- `/api/export/followups`
- `/api/export/followups?format=xlsx`
- `/api/export/quotations`
- `/api/export/quotations?format=xlsx`

## Notes
- Single-admin login is intentional for MVP.
- User model/relations are prepared for future multi-user expansion.
- AI generation is abstracted in `lib/ai-service.ts` and currently mocked with deterministic business-safe logic.
- AI does not auto-send, auto-close, auto-price, or modify contractual terms.
