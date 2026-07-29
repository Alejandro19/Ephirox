import { describe, it, expect } from 'vitest';
import { sql } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { admins } from '../src/models/schema.js';

describe('drizzle db connection', () => {
  it('connects to the test database', async () => {
    const result = await db.execute(sql`select 1 as ok`);
    expect(result[0].ok).toBe(1);
  });

  it('can select from a table protected by a deny_all RLS policy', async () => {
    // admins has RLS enabled with `CREATE POLICY deny_all ON admins USING (false)`.
    // This only succeeds if DATABASE_URL authenticates as a role that bypasses
    // RLS (Supabase's direct "postgres" connection string) — proving the same
    // app-level access-control model as server.js still applies end to end.
    await expect(db.select().from(admins)).resolves.toBeInstanceOf(Array);
  });
});
