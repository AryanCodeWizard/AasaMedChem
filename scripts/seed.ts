// Seed script for AasaMedChem
// Run: npx tsx scripts/seed.ts

import bcrypt from 'bcryptjs';
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is required');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function seed() {
  console.log('🌱 Starting seed...\n');

  // Hash passwords
  const adminHash = await bcrypt.hash('Admin@1234', 12);
  const sellerHash = await bcrypt.hash('Seller@1234', 12);

  // Seed admin user
  const [admin] = await sql`
    INSERT INTO users (email, password_hash, name, role)
    VALUES ('admin@aasalab.in', ${adminHash}, 'Lab Admin', 'admin')
    ON CONFLICT (email) DO UPDATE SET password_hash = ${adminHash}
    RETURNING id, email, name, role
  `;
  console.log(`✅ Admin: ${admin.email} (${admin.id})`);

  // Seed seller user
  const [seller] = await sql`
    INSERT INTO users (email, password_hash, name, role)
    VALUES ('seller@demo.in', ${sellerHash}, 'Demo Seller', 'seller')
    ON CONFLICT (email) DO UPDATE SET password_hash = ${sellerHash}
    RETURNING id, email, name, role
  `;
  console.log(`✅ Seller: ${seller.email} (${seller.id})`);

  // Seed categories
  const [solvents] = await sql`
    INSERT INTO categories (name, description)
    VALUES ('Solvents', 'Organic and inorganic solvents for laboratory use')
    ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
    RETURNING id, name
  `;
  const [salts] = await sql`
    INSERT INTO categories (name, description)
    VALUES ('Salts & Reagents', 'Analytical reagent grade salts and chemicals')
    ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
    RETURNING id, name
  `;
  const [labware] = await sql`
    INSERT INTO categories (name, description)
    VALUES ('Labware', 'Laboratory consumables and equipment')
    ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
    RETURNING id, name
  `;
  console.log(`✅ Categories: ${solvents.name}, ${salts.name}, ${labware.name}`);

  // Seed products
  const products = [
    {
      name: 'Ethanol (99.9% HPLC Grade)',
      sku: 'ETH-99-HPLC',
      description: 'High purity HPLC grade ethanol suitable for chromatography and analytical applications. Meets ACS specifications.',
      category_id: solvents.id,
      base_unit: 'mL',
      allowed_units: ['mL', 'L'],
      price_per_base_unit: '0.850000',
      stock_quantity: '50000.000000', // 50L
    },
    {
      name: 'Sodium Chloride (AR Grade)',
      sku: 'NACL-AR-500',
      description: 'Analytical reagent grade NaCl with ≥99.5% purity. For buffer preparation and general laboratory use.',
      category_id: salts.id,
      base_unit: 'g',
      allowed_units: ['g', 'kg'],
      price_per_base_unit: '0.025000', // ₹25/kg
      stock_quantity: '5000.000000', // 5kg
    },
    {
      name: 'Acetone (AR Grade)',
      sku: 'ACT-AR-500',
      description: 'Analytical reagent grade acetone. Ideal for cleaning glassware and as a general purpose solvent.',
      category_id: solvents.id,
      base_unit: 'mL',
      allowed_units: ['mL', 'L'],
      price_per_base_unit: '0.045000', // ₹45/L
      stock_quantity: '25000.000000', // 25L
    },
    {
      name: 'Methanol (HPLC Grade)',
      sku: 'METH-HPLC-1L',
      description: 'HPLC grade methanol with ultra-low UV absorption. Essential for reversed-phase chromatography.',
      category_id: solvents.id,
      base_unit: 'mL',
      allowed_units: ['mL', 'L'],
      price_per_base_unit: '1.200000', // ₹1200/L
      stock_quantity: '30000.000000', // 30L
    },
    {
      name: 'Potassium Permanganate',
      sku: 'KMNO4-AR-250',
      description: 'AR grade KMnO4 crystals. Used as an oxidizing agent in titrations and organic synthesis.',
      category_id: salts.id,
      base_unit: 'g',
      allowed_units: ['g', 'kg'],
      price_per_base_unit: '0.400000', // ₹400/kg
      stock_quantity: '2000.000000', // 2kg
    },
    {
      name: 'Filter Paper (Whatman No.1)',
      sku: 'FP-W1-100',
      description: 'Qualitative filter paper, 11cm diameter, 100 sheets per pack. For general filtration.',
      category_id: labware.id,
      base_unit: 'item',
      allowed_units: ['item'],
      price_per_base_unit: '8.500000', // ₹8.50 per sheet (₹850/pack of 100)
      stock_quantity: '500.000000',
    },
    {
      name: 'Hydrochloric Acid (35%)',
      sku: 'HCL-35-500',
      description: 'Concentrated HCl 35% w/w. For acid digestion, pH adjustment, and analytical applications.',
      category_id: salts.id,
      base_unit: 'mL',
      allowed_units: ['mL', 'L'],
      price_per_base_unit: '0.180000', // ₹180/L
      stock_quantity: '10000.000000', // 10L
    },
    {
      name: 'Dichloromethane (DCM)',
      sku: 'DCM-AR-2L',
      description: 'AR grade dichloromethane. Widely used extraction solvent in organic chemistry.',
      category_id: solvents.id,
      base_unit: 'mL',
      allowed_units: ['mL', 'L'],
      price_per_base_unit: '0.650000', // ₹650/L
      stock_quantity: '15000.000000', // 15L
    },
  ];

  for (const p of products) {
    await sql`
      INSERT INTO products (name, sku, description, category_id, base_unit, allowed_units,
        price_per_base_unit, stock_quantity, low_stock_alert, created_by)
      VALUES (
        ${p.name}, ${p.sku}, ${p.description}, ${p.category_id}::uuid,
        ${p.base_unit}, ${p.allowed_units},
        ${p.price_per_base_unit}, ${p.stock_quantity}, '100', ${admin.id}::uuid
      )
      ON CONFLICT (sku) DO UPDATE SET
        name = EXCLUDED.name,
        price_per_base_unit = EXCLUDED.price_per_base_unit,
        stock_quantity = EXCLUDED.stock_quantity
    `;
    console.log(`  🧪 ${p.name} (${p.sku})`);
  }

  console.log(`\n✅ Seeded ${products.length} products`);
  console.log('\n🎉 Seed complete!\n');
  console.log('Test Credentials:');
  console.log('  Admin:  admin@aasalab.in / Admin@1234');
  console.log('  Seller: seller@demo.in / Seller@1234');
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
