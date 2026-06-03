import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  numeric,
} from 'drizzle-orm/pg-core';

// ── Users ──────────────────────────────────────────────────────────────────
export const users = pgTable('users', {
  id:           uuid('id').primaryKey().defaultRandom(),
  email:        text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  name:         text('name').notNull(),
  role:         text('role').notNull().default('seller'),
  is_active:    boolean('is_active').notNull().default(true),
  created_at:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Categories ─────────────────────────────────────────────────────────────
export const categories = pgTable('categories', {
  id:          uuid('id').primaryKey().defaultRandom(),
  name:        text('name').notNull().unique(),
  description: text('description'),
  created_at:  timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Units ──────────────────────────────────────────────────────────────────
export const units = pgTable('units', {
  code:      text('code').primaryKey(),
  label:     text('label').notNull(),
  dimension: text('dimension').notNull(),
  base_unit: text('base_unit').notNull(),
  to_base:   numeric('to_base', { precision: 18, scale: 10 }).notNull(),
});

// ── Products ───────────────────────────────────────────────────────────────
export const products = pgTable('products', {
  id:                  uuid('id').primaryKey().defaultRandom(),
  name:                text('name').notNull(),
  sku:                 text('sku').unique(),
  description:         text('description'),
  category_id:         uuid('category_id').references(() => categories.id),
  base_unit:           text('base_unit').notNull().references(() => units.code),
  allowed_units:       text('allowed_units').array().notNull(),
  price_per_base_unit: numeric('price_per_base_unit', { precision: 18, scale: 6 }).notNull(),
  stock_quantity:      numeric('stock_quantity', { precision: 20, scale: 6 }).notNull().default('0'),
  low_stock_alert:     numeric('low_stock_alert', { precision: 20, scale: 6 }).notNull().default('0'),
  is_active:           boolean('is_active').notNull().default(true),
  created_by:          uuid('created_by').notNull().references(() => users.id),
  created_at:          timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at:          timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Quotations ─────────────────────────────────────────────────────────────
export const quotations = pgTable('quotations', {
  id:            uuid('id').primaryKey().defaultRandom(),
  quotation_no:  text('quotation_no').notNull().unique(),
  seller_id:     uuid('seller_id').notNull().references(() => users.id),
  status:        text('status').notNull().default('pending'),
  subtotal_inr:  numeric('subtotal_inr', { precision: 18, scale: 6 }).notNull().default('0'),
  total_inr:     numeric('total_inr', { precision: 18, scale: 6 }).notNull().default('0'),
  notes:         text('notes'),
  admin_notes:   text('admin_notes'),
  reviewed_by:   uuid('reviewed_by').references(() => users.id),
  reviewed_at:   timestamp('reviewed_at', { withTimezone: true }),
  created_at:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at:    timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Quotation Line Items ───────────────────────────────────────────────────
export const quotationLineItems = pgTable('quotation_line_items', {
  id:                  uuid('id').primaryKey().defaultRandom(),
  quotation_id:        uuid('quotation_id').notNull().references(() => quotations.id, { onDelete: 'cascade' }),
  product_id:          uuid('product_id').notNull().references(() => products.id),
  ordered_unit:        text('ordered_unit').notNull().references(() => units.code),
  ordered_qty:         numeric('ordered_qty', { precision: 20, scale: 6 }).notNull(),
  base_unit:           text('base_unit').notNull().references(() => units.code),
  base_qty:            numeric('base_qty', { precision: 20, scale: 6 }).notNull(),
  unit_price_snapshot: numeric('unit_price_snapshot', { precision: 18, scale: 6 }).notNull(),
  line_total_inr:      numeric('line_total_inr', { precision: 18, scale: 6 }).notNull(),
  created_at:          timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Audit Log ─────────────────────────────────────────────────────────────
export const auditLog = pgTable('audit_log', {
  id:          uuid('id').primaryKey().defaultRandom(),
  user_id:     uuid('user_id').references(() => users.id),
  action:      text('action').notNull(),
  entity_type: text('entity_type').notNull(),
  entity_id:   uuid('entity_id'),
  payload:     text('payload'), // JSON string
  ip_address:  text('ip_address'),
  created_at:  timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Quotation = typeof quotations.$inferSelect;
export type QuotationLineItem = typeof quotationLineItems.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Unit = typeof units.$inferSelect;
