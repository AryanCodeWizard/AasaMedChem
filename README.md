# AasaMedChem — Inventory & Order Management System
# AasaMedChem — Inventory & Quotation System

Comprehensive inventory and quotation platform built with Next.js, designed for precise unit-aware pricing and role-based workflows (Admin & Seller). This repository includes the app, API routes, DB schema (Drizzle), seed scripts, and utilities for unit conversions and currency formatting.

For a quick tour, see the live routes: `/admin` (Admin dashboard) and `/seller` (Seller portal).

---

**Table of contents**

- Project overview
- Architecture & tech
- Quick start (local)
- Environment variables
- Database & migrations
- Units & conversions
- APIs & auth
- Testing & CI
- Contributing & commit strategy
- Troubleshooting

---

## Project overview

- Purpose: Manage product catalogs, unit-aware pricing, and a quotation workflow with auditability.
- Key features: role-based access, precise numeric storage, unit conversion service, price snapshots for quotes, and seedable demo data.

## Architecture & tech

- **Frontend:** Next.js (App Router), React Server/Client components, CSS modules
- **Backend:** Next.js Route Handlers (API routes) + NextAuth for authentication
- **Database:** PostgreSQL (Neon-compatible) with Drizzle ORM types in `lib/db/schema.ts`
- **Auth:** NextAuth (Credentials provider), bcrypt for password hashing
- **Unit math:** `decimal.js` recommended for server arithmetic
- **Validation:** Zod schemas under `lib/validations`

## Quick start (local)

1. Install dependencies

```bash
npm install
```

2. Copy environment file and set secrets

```bash
cp .env.example .env.local
# edit .env.local and provide DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL
```

3. Run migrations and seed demo data

```bash
# If using psql directly with DATABASE_URL
psql "$DATABASE_URL" -f lib/db/migrations/001_initial.sql

# Seed demo units, users, products
npx tsx scripts/seed.ts
```

4. Start dev server

```bash
npm run dev
# Open http://localhost:3000
```

## Environment variables (example)

Add these to `.env.local`:

```
DATABASE_URL=postgresql://user:pass@host:port/dbname
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=http://localhost:3000
```

## Database & migrations

- Schema lives in `lib/db/schema.ts` and initial SQL migration in `lib/db/migrations/001_initial.sql`.
- IDs use UUIDs. Prices and quantities use `NUMERIC` with explicit precision to avoid floating-point errors.
- Use `scripts/migrate.ts` and `scripts/seed.ts` to run automated migrations and seed common units/products.

## Units & conversions

- The `units` table defines `code`, `label`, `dimension`, `base_unit`, and `to_base` (factor to convert the unit to the base unit).
- Products declare a `base_unit` and `allowed_units`; `products.stock_quantity` is stored in the product `base_unit`.
- Quotation line items store both the user's `ordered_unit`/`ordered_qty` and the computed `base_unit`/`base_qty` for consistent storage:

   `base_qty = ordered_qty × units.to_base(ordered_unit)`

- Recommended: Use `decimal.js` for all server-side arithmetic (do not use JS Number for multiply/divide of financial or quantity values).

## Common conversion examples

- Grams ↔ Kilograms: `1 kg = 1000 g` → to convert g→kg multiply by `0.001`
- Milliliters ↔ Liters: `1 L = 1000 mL` → mL→L multiply by `0.001`
- Pounds → grams (example seed): `1 lb = 453.59237 g` → store `to_base = 453.59237` if base unit is `g`

## How to add a new unit

1. Add a row to `units` (via seed or migration) with `code`, `label`, `dimension`, `base_unit`, and `to_base`.
2. Add the unit `code` to `products.allowed_units` for relevant products.
3. Validate dimension compatibility in `lib/validations/product.ts` before accepting conversions.

## APIs & Auth

- **Auth route:** `app/api/auth/[...nextauth]/route.ts` (NextAuth Credentials provider). See `lib/auth/config.ts`.
- **Role guard:** `lib/auth/guard.ts` exposes `requireRole()` to return 401/403 for unauthorized/forbidden requests.
- **Middleware:** `middleware.ts` redirects based on `nextauth.token.role` to keep `/admin` and `/seller` isolated.
- **Product/Quotation endpoints:** `app/api/products`, `app/api/quotations`, `app/api/users`.

## Precision, rounding & edge cases

- Store canonical values in base units and a single canonical currency per price snapshot.
- Use `NUMERIC` DB types; perform all arithmetic using a decimal library on the server and apply a single rounding mode (e.g., bankers/half-even) before persisting display/total values.
- Validate `units.dimension` to avoid converting between mass and volume.

## Testing & CI

- Write unit tests for `lib/units/*` conversion logic, `lib/validations/*`, and API guards.
- CI should run `npm test`, `npm run lint`, and type-checks.

## Scripts

- `scripts/migrate.ts` — run schema migrations
- `scripts/seed.ts` — seed demo data (units, example users, products)

## Development & commit strategy

- Use short-lived feature branches and small atomic commits with prefixes (e.g., `feat:`, `fix:`, `chore:`).
- Keep migrations/seeds in a dedicated commit separate from behavior code.
- Run linters and tests before pushing. Open PRs for review and squash/rebase as appropriate.

## Troubleshooting

- If conversions look off: confirm `units.to_base` for both ordered and base units; recompute using decimal arithmetic.
- If auth fails: ensure `NEXTAUTH_SECRET` is set and matches production/dev environments.

## Useful file references

- Schema: [lib/db/schema.ts](lib/db/schema.ts)
- Auth config: [lib/auth/config.ts](lib/auth/config.ts)
- Role guard: [lib/auth/guard.ts](lib/auth/guard.ts)
- Units helpers: [lib/units/conversions.ts](lib/units/conversions.ts) (if present)
- Seed script: [scripts/seed.ts](scripts/seed.ts)

---

If you want, I can also:

- Add example SQL seed inserts for `lb` and `gal` to `scripts/seed.ts`.
- Add a short `CONTRIBUTING.md` and CI workflow for tests.

Thank you — tell me which extras you'd like next.

## Detailed code references & examples (codebase-specific)

### npm scripts

- `npm run dev` — start Next.js dev server
- `npm run build` — build for production
- `npm run start` — start the built app
- `npm run lint` — run ESLint

These scripts are defined in `package.json`.

### Seed script behavior

- Run the seeder with `npx tsx scripts/seed.ts`. The current `scripts/seed.ts`:
   - creates demo users (`admin@aasalab.in`, `seller@demo.in`)
   - creates example categories and several products (Ethanol, Methanol, NaCl, etc.)
   - inserts products with `base_unit` and `allowed_units` and numeric fields stored as strings matching DB `NUMERIC` formats.

If you want to seed new units (e.g., `lb`, `gal`) add insert statements to `scripts/seed.ts` or create a migration. Example SQL inserts you can run directly against the DB:

```sql
INSERT INTO units (code, label, dimension, base_unit, to_base) VALUES
   ('lb',  'Pounds', 'weight', 'g', '453.59237'),
   ('gal', 'US Gallon', 'volume', 'mL', '3785.411784')
ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label, to_base = EXCLUDED.to_base;
```

Or add the same via `scripts/seed.ts` using the `neon` client:

```ts
await sql`INSERT INTO units (code,label,dimension,base_unit,to_base)
   VALUES ('lb','Pounds','weight','g','453.59237') ON CONFLICT (code) DO NOTHING`;
```

### Unit conversion & calculation code

- Client-side definitions and helpers: [lib/units/conversions.ts](lib/units/conversions.ts)
   - `toBaseUnit(qty, fromUnit)` and `fromBaseUnit(baseQty, toUnit)` perform simple numeric conversions using the `to_base` factors. These helpers also expose `formatBaseQty()` for UI-friendly formatting.
- Server-side precise math: [lib/units/calculations.ts](lib/units/calculations.ts)
   - Uses `decimal.js` with `precision: 20` and `ROUND_HALF_EVEN`.
   - `calculateLineTotal(orderedQty, toBase, pricePerBase)` returns `{ baseQty, lineTotal }` both as fixed 6-decimal strings appropriate for DB storage.

Example usage (server-side) when creating a quotation line item:

```ts
import { calculateLineTotal } from '@/lib/units/calculations';

const { baseQty, lineTotal } = calculateLineTotal(orderedQty, unit.to_base, product.price_per_base_unit);
// persist baseQty → quotation_line_items.base_qty and lineTotal → quotation_line_items.line_total_inr (or use for subtotal)
```

### Validation rules (product creation)

- See `lib/validations/product.ts` for exact rules. Highlights:
   - Allowed units: `g`, `kg`, `mL`, `L`, `item`.
   - `base_unit` must be one of the allowed units and included in `allowed_units`.
   - Price format: up to 12 integer digits and up to 6 fractional digits (`NUMERIC(18,6)` compatible).
   - Stock / low-stock: up to 14 integer digits and up to 6 fractional digits (`NUMERIC(20,6)` compatible).
   - The Zod `superRefine` ensures unit dimensions are consistent (no mixing weight and volume).

### Auth and role enforcement

- Authentication: NextAuth Credentials provider configured in [lib/auth/config.ts](lib/auth/config.ts). Passwords compared via `bcryptjs` and sessions are JWT-based with `role` and `id` added to tokens to avoid extra DB lookups.
- Route protection: `middleware.ts` redirects `/admin` vs `/seller` based on `nextauth.token.role`. Server handlers should call `requireRole()` from [lib/auth/guard.ts](lib/auth/guard.ts) to return proper 401/403 responses for API endpoints.

### Recommended additions (quick wins)

- Add `units` seeding to `scripts/seed.ts` so every environment has the same baseline unit rows.
- Add tests for `lib/units/calculations.ts` covering rounding, large/small values, and incompatible dimensions.
- Add `npm test` and `prettier` scripts and a basic GitHub Actions workflow to run lint/type/test on PRs.

---

If you want, I can now:

- update `scripts/seed.ts` to insert `units` automatically and commit the change, or
- create a small test suite for `lib/units/calculations.ts` and add a CI workflow.

Which would you prefer next?
│       ├── products/               # Products CRUD
│       ├── quotations/             # Quotations CRUD
│       └── users/                  # Users CRUD
├── lib/
│   ├── db/                         # Neon client, schema, migrations
│   ├── auth/                       # NextAuth config, role guard
│   ├── units/                      # Unit conversions, calculations
│   ├── validations/                # Zod schemas
│   └── utils/                      # Currency formatting
├── components/shared/              # Shared UI components
├── scripts/seed.ts                 # Database seeder
└── middleware.ts                   # Auth route protection
```

## 🔒 Security

- All API inputs validated through Zod schemas
- Parameterized SQL queries (no SQL injection)
- bcrypt password hashing (12 rounds)
- JWT sessions with 8-hour expiry
- Role checks in both middleware and route handlers
- Sellers can only access their own quotations (no IDOR)

---

*Built for AasaMedChem Hackathon Assignment — all design decisions documented per requirements.*
