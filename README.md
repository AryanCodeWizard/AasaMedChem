# AasaMedChem — Inventory & Order Management System

> **Next.js 14 (App Router) · Neon PostgreSQL · NextAuth.js · Vercel**

A professional inventory and order management system built for medicinal chemistry laboratories. Features role-based access control (Admin/Seller), unit-aware pricing with precise decimal arithmetic, and a full quotation workflow.

---

## ✨ Features

- **Role-based access** — Admin and Seller dashboards with route protection
- **Product management** — CRUD with unit-aware pricing (g, kg, mL, L, item)
- **Full-text search** — PostgreSQL GIN index on product names
- **Unit conversion** — Prices stored per base unit; automatic conversion for display
- **Quotation workflow** — Seller places → Admin approves/rejects → Stock decremented
- **Price snapshots** — Prices locked at quotation time for auditability
- **INR formatting** — Indian number system (lakhs/crores) with ₹ symbol
- **Precise arithmetic** — `NUMERIC` types + `decimal.js` (no IEEE 754 float errors)
- **Responsive UI** — Dark-mode design with glassmorphism, micro-animations

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React, CSS Custom Properties |
| Backend | Next.js Route Handlers (serverless) |
| Database | Neon PostgreSQL (serverless) |
| ORM | `@neondatabase/serverless` + raw SQL |
| Auth | NextAuth.js v4 (JWT + Credentials) |
| Validation | Zod |
| Arithmetic | decimal.js |
| Schema | Drizzle ORM (type definitions) |

## 📊 Database Schema

Key tables (see `lib/db/migrations/001_initial.sql` for complete schema):

| Table | Purpose |
|-------|---------|
| `users` | Admin and Seller accounts with bcrypt-hashed passwords |
| `units` | Unit definitions with `to_base` conversion factors |
| `products` | Product catalogue with base unit pricing and stock |
| `quotations` | Quotation headers (status workflow, totals) |
| `quotation_line_items` | Per-product line items with dual-unit storage |
| `categories` | Product categorization |
| `audit_log` | Action audit trail |

### Unit Storage Strategy

- **Base units**: `g` (weight), `mL` (volume), `item` (count)
- All quantities stored in base units (`base_qty` column)
- Seller's original unit and quantity preserved (`ordered_unit` / `ordered_qty`)
- Price stored as INR per 1 base unit (`price_per_base_unit`)
- Conversions applied server-side using `units.to_base` factor

### Data Types

| Field | PostgreSQL Type | Rationale |
|-------|----------------|-----------|
| Prices | `NUMERIC(18,6)` | Exact decimal, no float rounding |
| Quantities | `NUMERIC(20,6)` | Large range for volume in mL |
| Conversion factors | `NUMERIC(18,10)` | High precision |
| IDs | `UUID` | No guessable sequential IDs |

## 🚀 Local Setup

```bash
# 1. Clone and install
git clone https://github.com/AryanCodeWizard/AasaMedChem.git
cd AasaMedChem
npm install

# 2. Configure environment
cp .env.example .env.local
# Fill in DATABASE_URL from Neon dashboard
# Generate NEXTAUTH_SECRET: openssl rand -base64 32

# 3. Run database migration
psql $DATABASE_URL -f lib/db/migrations/001_initial.sql

# 4. Seed demo data
npx tsx scripts/seed.ts

# 5. Start dev server
npm run dev
# → http://localhost:3000
```

## ☁️ Vercel Deployment

```bash
# Set environment variables
vercel env add DATABASE_URL
vercel env add NEXTAUTH_SECRET
vercel env add NEXTAUTH_URL   # https://your-app.vercel.app

# Deploy
vercel --prod
```

## 🔑 Test Credentials

| Role | Email | Password |
|------|-------|---------|
| Admin | admin@aasalab.in | Admin@1234 |
| Seller | seller@demo.in | Seller@1234 |

## 📋 How to Use

### Admin Workflow
1. **Log in** → redirected to `/admin`
2. **Products** → Create product (set name, SKU, unit type, price per base unit, stock)
3. **Users** → Create seller accounts
4. **Quotations** → View all pending quotations → Approve or Reject
   - On approval: stock is automatically decremented

### Seller Workflow
1. **Log in** → redirected to `/seller`
2. **Browse Products** → search by name, see prices with unit conversions
3. **Add to Cart** → select quantity and unit (e.g., 2.5 L of Ethanol)
4. See **live price calculation** before placing order
5. **Place Quotation** → add optional notes, submit
6. **My Quotations** → track status (pending / approved / rejected)

### Price Calculation Example
```
Product: Ethanol, price = ₹0.85/mL
Order: 2.5 L
→ toBaseUnit(2.5, 'L') = 2500 mL
→ 2500 × ₹0.85 = ₹2,125.00

Same product, 500 mL order:
→ toBaseUnit(500, 'mL') = 500 mL
→ 500 × ₹0.85 = ₹425.00
```

## 📁 Project Structure

```
├── app/
│   ├── login/page.tsx              # Login page
│   ├── admin/                      # Admin dashboard
│   │   ├── page.tsx                # Dashboard home with stats
│   │   ├── products/               # Product CRUD
│   │   ├── quotations/             # Quotation management
│   │   └── users/                  # User management
│   ├── seller/                     # Seller portal
│   │   ├── page.tsx                # Seller dashboard
│   │   ├── products/               # Browse & search
│   │   ├── cart/                   # Cart + quotation builder
│   │   └── quotations/             # My quotations
│   └── api/                        # REST API endpoints
│       ├── auth/[...nextauth]/     # NextAuth handler
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
