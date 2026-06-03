const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is required');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

(async function() {
  try {
    const rows = await sql`SELECT id, email, role, is_active FROM users WHERE email IN ('seller@demo.in','admin@aasalab.in')`;
    console.log('DB query result:');
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Query failed:', err);
    process.exit(1);
  }
})();
