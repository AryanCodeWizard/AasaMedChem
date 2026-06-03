import * as schema from './schema';

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';

// Neon database client
const sql = neon(process.env.DATABASE_URL!);  //creates a connection to postgres

// Drizzle ORM instance
export const db = drizzle(sql, { schema });  //helps your application interact with a SQL database using TypeScript instead of writing raw SQL everywhere

// Raw SQL access
export { sql };