# Staywise PMS

Hotel Property Management System built with Next.js 16, Prisma, PostgreSQL, and NextAuth.

## Setup

Create `.env` with your database and auth secret:

```bash
DATABASE_URL="postgresql://user:pass@host:5432/staywise"
DIRECT_URL="postgresql://user:pass@host:5432/staywise"   # direct (non-pooled) connection for migrations
NEXTAUTH_SECRET="<openssl rand -base64 32>"
NEXTAUTH_URL="http://localhost:3000"
```

Then:

```bash
npm install
npx prisma generate
npx prisma migrate deploy          # creates / updates tables from prisma/migrations
npm run dev
```

Sign in as an admin and open **Settings → Hotel details, room types and rooms** (`/setup`)
to enter the hotel name, logo, time zone, main currency, room types, rooms and staff.

### Demo data (never on a live hotel)

```bash
ALLOW_DEMO_SEED=1 npx prisma db seed   # demo hotel; logins admin@staywise.com / admin1234
```

The seed refuses to run without `ALLOW_DEMO_SEED=1`. If a database was ever seeded,
change or deactivate the demo accounts before real staff use it.

## Database migrations

The schema is managed with `prisma migrate` (it used to be `db push`).

**Existing database (created with `db push` before October 2026) — one-time baseline:**

```bash
# 1. Drift check: what would it take to go from the live DB to the new schema?
npx prisma migrate diff --from-url "$DIRECT_URL" --to-schema-datamodel prisma/schema.prisma --script
#    Expected: only ADD COLUMN / CREATE TABLE / CREATE INDEX lines matching
#    prisma/migrations/20261002000000_pilot_hardening/migration.sql.
#    Any DROP or ALTER of existing columns means the DB drifted — stop and compare first.
# 2. Mark the baseline as already applied
npx prisma migrate resolve --applied 0_init
# 3. Apply everything newer
npx prisma migrate deploy
```

The October 2026 migration only adds columns / tables, so the previous app version keeps
working against the migrated database — migrate first, then deploy the code.

**Later schema changes:** edit `schema.prisma`, run `npx prisma migrate dev --name <change>`
against a dev database, commit the folder, and run `npx prisma migrate deploy` on production.

## Checks

```bash
npm run typecheck   # tsc
npm test            # unit tests: business dates, folio math, CSV, currency
```

GitHub Actions runs both on every push.

## Stack

- **Next.js 16** (App Router, Turbopack) · React 18
- **Prisma 5** + PostgreSQL
- **NextAuth v4** (credentials provider, JWT sessions)
- **Tailwind CSS v3** · **TypeScript** · **lucide-react** (icons) · **motion** (animations)

## Features

### Front Desk
- Dashboard with live stats — occupancy, arrivals, departures, pending traces
- Reservations list with filters; global header search (guest / reservation no. / room)
- Check-in / check-out workflows with verification checklist
- Move room, extend stay, cancel, no-show — all with room-availability conflict checks
- **Double-booking prevention** — overlapping reservations for a room are rejected server-side
- Room Grid (color-coded) and 14-day Room Timeline with drag-and-drop moves
- Guest history with profile preferences and dedup by passport/email/phone

### Billing & Folios
- Multiple folios per reservation; move charges between folios
- Charges, payments, and packages (breakfast, parking, transfers…)
- **Advance deposits** — record a pre-arrival deposit (bank transfer, cash, card…) with a slip reference; it nets out of the folio automatically at check-out
- **Multi-currency** — house exchange-rate table (THB / USD / MMK…) with a cross-rate reference grid in Settings; payments and deposits can be tendered in any configured currency, converted server-side at the house rate with the original amount noted on the charge line
- Settlement by cash (tendered-amount enforced), card, transfer, PromptPay, company credit, or city ledger
- **Check-out is blocked until every folio is settled and every charge is assigned** — enforced by the API, not just the UI
- **City ledger integrity** — posting a folio to a company account is idempotent (re-posting updates the existing receivable instead of duplicating it), and settling requires the posted amount to match the folio balance exactly
- **Early departure** — one-click "shorten stay to today" at check-out so the guest is billed for nights actually stayed
- **Group billing**: link rooms under a master reservation (Linked tab), then "Bill to Master Room" at check-out transfers a linked room's entire balance to the master's folio — the tour leader / company pays once for the whole group
- Company credit accounts with limits, monthly reset, manager override (receivable always recorded), and city ledger AR
- Tax invoices with VAT, printable folios / invoices / company statements
- Printed folio always shows the projected room charge, even before night audit posts the nightly lines

### Operations
- **Night audit** — posts nightly room charges to in-house folios (idempotent per business date); folio balances account for posted nights so the room is never double-counted
- **Shift close / cash drop** — one cash drawer per hotel; open a shift with a float, close with a blind count (expected cash is revealed only after the clerk submits), variance logged with a full breakdown and shift history
- **Housekeeping board** — rooms grouped by status with one-tap "Mark Clean"; housekeeping role can only mark rooms clean, and occupied rooms can't be flipped
- Traces (inter-department notes) with resolution tracking

### Reports & Guest Communication
- **Manager flash report** — printable end-of-day A4: occupancy, room revenue, ADR, RevPAR, collections by payment method, deposits taken, AR outstanding, arrivals/departures and night-audit status
- **Foreign guest registration** — printable immigration report of foreign arrivals per date (full passport numbers, A4 landscape)
- **Booking confirmation** — printable confirmation page with one-tap "Copy for Viber / WhatsApp" plain-text share (includes deposit received / balance due)

### Setup, staff and audit
- **Setup wizard** (`/setup`) — hotel details and logo, time zone, main currency, the hotel's own room types and prices, bulk-add rooms by floor and number range, staff logins
- **Activity log** — every change to bookings, money, rooms, staff and settings, plus sign-ins and data exports, with who and when (Settings)
- **Staff accounts** — deactivate instead of delete; new and admin-reset passwords must be changed at first sign-in; everyone can change their own password (My account)
- **English / Burmese** — language toggle in the sidebar (shell, housekeeping, account, loading and error screens so far)
- **Works on phones and tablets** — slide-out menu, stacked panels, scrollable tables
- **Slow-connection feedback** — progress bar on any slow request and a plain note after 5 s

### Receipts and exports
- **80 mm thermal receipt** with the hotel logo, in the hotel's currency
- **Export to Excel** (Reports) — bookings, payments collected, company balances, guest list (no passport numbers)

### Management
- Analytics — revenue, occupancy, ADR/RevPAR, source & company breakdowns, year comparison
- Accounting — collections by payment method, AR aging, city ledger settlement
- User management with roles; charge-code catalogue

## Security

- **Login throttling** — 5 attempts per email and 20 per IP per 15 min, stored in Postgres so it holds across serverless instances
- **Enumeration-safe login** — constant-time behaviour for unknown emails (dummy hash compare); deactivated accounts get the same message
- **Sessions** — JWT capped at 24 h and re-checked against the user every 5 min (role changes / deactivation apply quickly)
- **RBAC** on every mutating/financial endpoint — `admin`, `manager`, `front_desk`, `housekeeping`; roles are validated
- **Hotel isolation** — every query scoped to the authenticated user's hotel; a session without a hotel is rejected
- **Audit trail** — all mutating API calls, logins and exports (passwords / passport numbers redacted)
- **Security headers** — `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`
- **PDPA (Thailand)** — passport numbers masked in list views and excluded from exports
- `npm audit`: 0 known vulnerabilities (October 2026)

## Operations

- **Time zone** — business dates ("today", arrivals, night audit, report days) use the hotel's time zone from Setup. A night audit run before 06:00 hotel time closes the previous day.
- **Backups** — Supabase Free has no point-in-time recovery. Before go-live either upgrade to a plan with daily backups, or run a nightly `pg_dump "$DIRECT_URL" > staywise-$(date +%F).sql` from a machine you control and keep at least 14 days.
- **Error monitoring** — errors go to Vercel's function logs. For alerts, add Sentry (`npx @sentry/wizard@latest -i nextjs`, free tier) with your own account.

## Known limits

- `Room.id` is the room number and is unique across the whole database — two hotels can't both have room 101. Fine for a single pilot hotel; needs a key change before a second hotel shares the database.
- Money columns are `Float`. Amounts are rounded where they're shown, but long-running totals should move to `Decimal` before multi-currency accounting grows.
- Burmese translations need a native-speaker review; untranslated screens fall back to English.

## Project Structure

```
app/
  (auth)/login/      ← Animated login page
  (dashboard)/       ← Protected pages (dashboard, reservations, timeline,
                        rooms, housekeeping, guests, companies, shift,
                        reports, analytics, accounting, settings)
  api/               ← REST API routes (auth, reservations, folios, deposits,
                        rooms, companies, credit, shifts, settings,
                        tax-invoices, reports, search…)
  print/             ← Printable folio / confirmation / flash report /
                        foreigner registration / invoice / company statement
components/          ← UI components (views, modals, panels, toaster)
lib/                 ← Prisma, auth, RBAC, rate limit, audit, dates / hotel time,
                        folio math, currency, CSV, i18n, toast bus, utils
types/               ← TypeScript interfaces
prisma/              ← Schema + today-relative demo seed
tests/               ← Unit tests (node:test)
```
