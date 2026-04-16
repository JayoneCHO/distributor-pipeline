# Overseas Medical Device Sales Follow-up MVP

A Flask-based MVP web app for a Korean aesthetic medical device export sales manager.

## Features

- Lead database with fields: company, country, contact person, email, WhatsApp, source event, interested products.
- Product tags included: `PICO RU`, `REBEAM`, `MIWAVE`, `FONS SVR`, `LAMIS XL`.
- Timeline per lead for communication history.
- Status pipeline: New Lead → Contacted → Waiting Reply → Negotiation → Closed Won → Closed Lost.
- Follow-up reminder queue for leads without reply at 3, 7, and 14 days.
- Draft generator for Email/WhatsApp by stage and product.
- Message template manager (reusable templates with placeholders).
- Price template manager (included options + optional handpieces).
- Dashboard: overdue follow-ups, hot leads, country-wise opportunities.
- Export leads to CSV and Excel.
- API namespace placeholders for future Gmail/Calendar integrations.
- Single-admin authentication for MVP.

## Tech Stack

- Backend: Flask + SQLAlchemy
- DB: SQLite by default (switchable via `DATABASE_URL`)
- UI: Server-rendered templates + Bootstrap 5

## Run Locally

### 1) Create environment and install deps

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2) (Optional) Configure environment variables

```bash
export SECRET_KEY='change-me'
export ADMIN_USERNAME='admin'
export ADMIN_PASSWORD='admin1234'
# Optional DB override:
# export DATABASE_URL='postgresql+psycopg://user:pass@localhost:5432/followup'
```

### 3) Start app

```bash
python app.py
```

Open `http://127.0.0.1:5000`.

Default login: `admin` / `admin1234` (or your env override).

## API Notes

Current API endpoint examples:

- `GET /api/v1/leads`
- `POST /api/v1/integrations/gmail/sync` (placeholder)
- `POST /api/v1/integrations/calendar/sync` (placeholder)

These are intentionally structured to make future integration easy.

## Suggested Next Steps (Post-MVP)

- OAuth + role-based access.
- Real Gmail/Calendar sync jobs.
- Rich filtering/search and Kanban board drag/drop.
- Activity analytics and conversion funnel metrics.
- Multi-user support and permissions.
