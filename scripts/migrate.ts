// Run migration via Neon serverless driver — executes entire SQL as one batch
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL env var required');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function migrate() {
  const migrationPath = resolve(import.meta.dirname, '../lib/db/migrations/001_initial.sql');
  const migration = readFileSync(migrationPath, 'utf-8');

  console.log('🔄 Running database migration...\n');

  try {
    await sql.query(migration);
    console.log('✅ Migration completed successfully!');
  } catch (err) {
    const msg = (err as Error).message;
    console.error('❌ Migration error:', msg);
    
    // If batch fails, try individual statements
    if (msg.includes('cannot insert multiple commands')) {
      console.log('\n⚠️  Batch mode not supported. Running statements individually...\n');
      await runIndividually(migration);
    } else {
      process.exit(1);
    }
  }
}

async function runIndividually(migration: string) {
  // Properly split SQL respecting $$ blocks
  const stmts: string[] = [];
  let buf = '';
  let inDollar = false;
  
  for (const line of migration.split('\n')) {
    const trimmed = line.trim();
    
    // Track dollar-quoted blocks
    const matches = trimmed.match(/\$\$/g);
    if (matches) {
      for (const _ of matches) inDollar = !inDollar;
    }
    
    buf += line + '\n';
    
    if (trimmed.endsWith(';') && !inDollar) {
      const cleaned = buf.split('\n')
        .filter(l => l.trim() && !l.trim().startsWith('--'))
        .join('\n').trim();
      if (cleaned) stmts.push(buf.trim());
      buf = '';
    }
  }
  
  let ok = 0, skip = 0, fail = 0;
  
  for (const stmt of stmts) {
    const firstLine = stmt.split('\n').find(l => l.trim() && !l.trim().startsWith('--'))?.trim().slice(0, 80) || '';
    try {
      await sql.query(stmt);
      ok++;
      console.log(`  ✅ ${firstLine}`);
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes('already exists') || msg.includes('duplicate')) {
        skip++;
        console.log(`  ⏭️  ${firstLine} (exists)`);
      } else {
        fail++;
        console.error(`  ❌ ${firstLine}`);
        console.error(`     ${msg}`);
      }
    }
  }
  
  console.log(`\n📊 Results: ${ok} succeeded, ${skip} skipped, ${fail} failed`);
}

migrate().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
