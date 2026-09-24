import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { PGlite } from '@electric-sql/pglite';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/edutrack';

let dbInstance: ReturnType<typeof drizzlePg<typeof schema>> | ReturnType<typeof drizzlePglite<typeof schema>>;

// In-memory PGlite instance for fallback/testing environments
let pgliteSingleton: PGlite | null = null;

export function getDb() {
  if (dbInstance) return dbInstance;

  try {
    if (process.env.NODE_ENV === 'test' || !process.env.DATABASE_URL) {
      if (!pgliteSingleton) {
        pgliteSingleton = new PGlite();
      }
      dbInstance = drizzlePglite(pgliteSingleton, { schema });
    } else {
      const client = postgres(connectionString, { max: 10, idle_timeout: 20 });
      dbInstance = drizzlePg(client, { schema });
    }
  } catch (err) {
    console.warn('Failed to connect to PostgreSQL, falling back to embedded PGlite instance:', err);
    if (!pgliteSingleton) {
      pgliteSingleton = new PGlite();
    }
    dbInstance = drizzlePglite(pgliteSingleton, { schema });
  }

  return dbInstance;
}

export const db = getDb();
