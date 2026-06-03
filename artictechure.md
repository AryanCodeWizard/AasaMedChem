**AasaMedChem — Architecture & Workflows**

This document describes the high-level architecture, data modeling, unit handling strategy, and the detailed user workflows implemented in the AasaMedChem project. It is intended as a reviewer-friendly complement to the main `README.md` and maps features to code locations.

**Overview**
- **Purpose**:Inventory and quotation/order management with unit-aware pricing, role-based access (Admin / Seller), and Neon-hosted PostgreSQL persistence.
- **Frontend**: Next.js (App Router) — files under [app/](app/)
- **Backend**: Next.js Route Handlers (serverless functions) in [app/api/](app/api/)
- **Database**: Neon PostgreSQL, schema and types in [lib/db/schema.ts](lib/db/schema.ts)
- **Auth**: NextAuth credentials provider, config at [lib/auth/config.ts](lib/auth/config.ts)
- **Units & conversions**: Static definitions + server calculations at [lib/units/conversions.ts](lib/units/conversions.ts) and [lib/units/calculations.ts](lib/units/calculations.ts)

**System Components & File Map**
- **UI / Pages**: `app/admin/*` (admin panel), `app/seller/*` (seller flows), `app/login/page.tsx` (auth). See [app/](app/).
- **APIs**: `app/api/products/route.ts`, `app/api/quotations/route.ts`, `app/api/users/route.ts` — primary handlers for product CRUD, search, and quotation lifecycle.
- **DB Layer**: `lib/db/index.ts` (Neon client + `sql` export), `lib/db/schema.ts` (Drizzle types + table definitions).
- **Auth**: `lib/auth/config.ts` — Credentials provider; sets JWT session with `role` + `id`.
- **Units**: `lib/units/conversions.ts` (unit definitions, toBase/fromBase helpers), `lib/units/calculations.ts` (`decimal.js` math for totals).
- **Validation**: `lib/validations/*` — Zod schemas for products and quotations.
- **Scripts**: `scripts/migrate.ts`, `scripts/seed.ts` for DB setup and demo data.

**Data Model (principal tables)**
- **users**: UUID PK, `email`, `password_hash`, `role` (`admin` | `seller`), `is_active` — defined in [lib/db/schema.ts](lib/db/schema.ts).
- **units**: `code`, `label`, `dimension`, `base_unit`, `to_base` — conversion factors (seeded/static). See [lib/db/schema.ts](lib/db/schema.ts).
- **products**: `id`, `name`, `sku`, `category_id`, `base_unit`, `allowed_units` (text[]), `price_per_base_unit` (NUMERIC(18,6)), `stock_quantity` (NUMERIC(20,6)). See [lib/db/schema.ts](lib/db/schema.ts).
- **quotations**: `quotation_no`, `seller_id`, `status`, `subtotal_inr`, `total_inr`, timestamps.
- **quotation_line_items**: preserves both seller-provided values and normalized values: `ordered_unit`, `ordered_qty` (original), `base_unit`, `base_qty` (normalized), `unit_price_snapshot`, `line_total_inr`.

**Unit Storage & Conversion Strategy**
- **Base units chosen**: weight → `g`; volume → `mL`; count → `item`.
- **Storage rule**: All canonical quantities are stored in base units (`base_qty` columns). The user's original inputs (`ordered_unit`, `ordered_qty`) are preserved for auditing and display.
- **Price storage**: `price_per_base_unit` stores INR price for 1 unit of the product's `base_unit` as `NUMERIC(18,6)`.
- **Conversion factors**: Stored in `units.to_base` as high-precision `NUMERIC(18,10)`. Example mappings (seeded and mirrored in `lib/units/conversions.ts`):
  - `kg` → base `g`: to_base = 1000
  - `g` → base `g`: to_base = 1
  - `L` → base `mL`: to_base = 1000
  - `mL` → base `mL`: to_base = 1
  - `item` → base `item`: to_base = 1
- **Where conversions are applied**:
  - Input validation & normalization: API layer validates `ordered_unit` via Zod (`lib/validations/quotation.ts`).
  - Conversion to base for calculations: `lib/units/conversions.ts` helpers and `lib/units/calculations.ts` (uses `decimal.js`) compute `baseQty = orderedQty × to_base` and `lineTotal = baseQty × price_per_base_unit`.
  - At quotation creation: server computes `base_qty`, `unit_price_snapshot` (price at time of quotation), and `line_total_inr` and saves them into `quotation_line_items`.

**Numeric Types & Precision Rationale**
- **Prices**: `NUMERIC(18,6)` — six decimal places to allow sub-rupee precision when working with very small base units (e.g., price/mL).
- **Quantities**: `NUMERIC(20,6)` — supports very large counts and fractional values with micro precision.
- **Conversion factors**: `NUMERIC(18,10)` — high precision to avoid rounding error during unit transforms.
- **Arithmetic**: All runtime math uses `decimal.js` with precision set to 20 (see [lib/units/calculations.ts](lib/units/calculations.ts)). This avoids IEEE 754 float issues.

**API Contract (important endpoints)**
- **GET /api/products** — list/search with `q`, `category`, pagination. Implementation: [app/api/products/route.ts](app/api/products/route.ts).
- **POST /api/products** — create product (admin only). Implementation: [app/api/products/route.ts](app/api/products/route.ts).
- **POST /api/quotations** — create quotation with items; server computes base_qty & pricing snapshot (see `app/api/quotations/route.ts`).
- **GET /api/quotations/:id** — fetch quotation with items; admin sees all, sellers see their own.
- **POST /api/quotations/:id/action** — admin actions (`approve`, `reject`, `cancel`) which update status and on `approve` decrement product stock.

**Workflows (detailed)**

- **Seller: Browse → Quotation flow**
  1. Seller logs in via `/login` (NextAuth credentials). Auth is configured in [lib/auth/config.ts](lib/auth/config.ts).
  2. Seller visits product listing (`/seller/products`) and searches using `q` or filters by category — frontend calls `GET /api/products?q=...`.
  3. Seller chooses products and for each selects an `ordered_unit` (e.g., `L`) and `ordered_qty` (e.g., `2.5`). UI uses `lib/units/conversions.ts` client-side definitions to allow friendly displays.
  4. When building quotation, client shows live calculation: it requests product `price_per_base_unit` (server-provided) and computes using `decimal.js` on client or trusts server calculation. Calculation steps used by server:
     - `toBase = units.to_base` (e.g., `L` → 1000)
     - `baseQty = orderedQty × toBase` (2.5 × 1000 = 2500 mL)
     - `lineTotal = baseQty × price_per_base_unit` (2500 × price/mL)
  5. Seller submits quotation via `POST /api/quotations` with `items: [{ product_id, ordered_qty, ordered_unit }, ...]`.
  6. Server validates with Zod, looks up `price_per_base_unit` and `to_base`, computes `base_qty`, `unit_price_snapshot`, and `line_total_inr`, then inserts `quotations` + `quotation_line_items` rows.
  7. Seller can view their submitted quotations at `/seller/quotations`.

- **Admin: Review → Approve flow**
  1. Admin logs in and navigates to `/admin/quotations` to see pending quotations. Server endpoint provides full line-item details including `ordered_qty`, `ordered_unit`, `base_qty`, `unit_price_snapshot`, and `line_total_inr` for manual verification.
  2. Admin reviews pricing and conversions (UI shows both original and base units). The admin UI pulls calculations from stored snapshots so numbers are immutable for audit.
  3. If Admin approves the quotation:
     - Server updates `quotations.status = 'approved'` and records `reviewed_by`, `reviewed_at`, and `admin_notes`.
     - Server decrements `products.stock_quantity` by `SUM(line.base_qty)` for each line item (ensure same base units). This operation is executed in a transaction to maintain consistency.
  4. If Admin rejects or cancels, status updates accordingly; no stock change occurs.

- **Inventory management (Admin)**
  - Admin can `POST /api/products` (create), `PUT /api/products/:id` (update), and `DELETE /api/products/:id` (soft delete recommended) from the admin UI.
  - When changing `price_per_base_unit`, existing quotations are unaffected because `unit_price_snapshot` preserves historical price.

**Example Calculation (reference)**
- Product A: `base_unit = mL`, `price_per_base_unit = 0.85` INR (per mL)
- Seller orders `2.5 L` of Product A
  - `to_base (L → mL) = 1000`
  - `base_qty = 2.5 × 1000 = 2500 mL`
  - `line_total = 2500 × 0.85 = 2125.00 INR`

**Security & Authorization**
- **Auth**: Credentials provider with bcrypt; JWT session strategy with `role` embedded. See [lib/auth/config.ts](lib/auth/config.ts).
- **Route protection**: Each API checks session + `role` (examples in product routes). Middleware (`middleware.ts`) is used to protect app routes.
- **Validation**: All API inputs validated with Zod.
- **SQL safety**: Queries use the `sql` tagged-template helper exported from `lib/db/index.ts` which parameterizes interpolations.

**Deployment & Environment**
- **Required env vars**: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`.
- **Local run**:
  ```bash
  cd my-app
  npm install
  cp .env.example .env.local
  # set DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL
  npm run dev
  ```
- **DB setup**:
  - Apply migrations: `psql $DATABASE_URL -f lib/db/migrations/001_initial.sql` (or run `scripts/migrate.ts`).
  - Seed demo data: `npx tsx scripts/seed.ts` (seeds `units`, `products`, and test users).
- **Vercel**: Add env vars in Vercel dashboard, then `vercel --prod` to deploy.

**Operational notes & assumptions**
- The system uses `price_per_base_unit` and `base_qty` to keep arithmetic simple and auditable.
- All conversions use exact `to_base` factors (no dynamic density conversions for mixed-dimension products).
- Price rounding: amounts are stored with 6 decimal places; UI displays INR formatted values (see `lib/utils/currency.ts`).
- Seed file contains sample users (`admin@aasalab.in`, `seller@demo.in`) — verify after seeding.

**Where to inspect code for each responsibility**
- Auth: [lib/auth/config.ts](lib/auth/config.ts)
- DB connection: [lib/db/index.ts](lib/db/index.ts)
- Schema: [lib/db/schema.ts](lib/db/schema.ts)
- Product API: [app/api/products/route.ts](app/api/products/route.ts)
- Quotation validation: [lib/validations/quotation.ts](lib/validations/quotation.ts)
- Unit helpers: [lib/units/conversions.ts](lib/units/conversions.ts)
- Arithmetic: [lib/units/calculations.ts](lib/units/calculations.ts)
- Seed & migration scripts: [scripts/seed.ts](scripts/seed.ts), [lib/db/migrations/001_initial.sql](lib/db/migrations/001_initial.sql)

**Review checklist for submission**
- Ensure the app is deployed and include the Vercel URL in `README.md`.
- Confirm `scripts/seed.ts` creates the test users in the README.
- Verify GIN index exists on product name for text search in migration SQL.
- Run through the Seller → Quotation → Admin approval flow locally.

If you want, I will now run a quick verification: check migration contents, confirm seed users exist, and attempt to start the dev server locally. Which of those would you like me to do first?
