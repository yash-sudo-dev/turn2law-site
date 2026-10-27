// Database layer. PGlite (real Postgres, in-process) for local dev; the same
// migrations run against the production Supabase project when it lands.
// Request-scoped work MUST go through withUser() so RLS applies (app_user
// role is NOBYPASSRLS). System work (migrations, seeding) uses system().
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const MIGRATIONS_DIR = join(here, '..', '..', 'migrations');

export async function createDb(dataDir) {
  const db = new PGlite(dataDir, { extensions: { pgcrypto } });
  return {
    raw: db,
    async system(sql, params) {
      const r = await db.query(sql, params);
      return r.rows;
    },
    // Run a unit of request work as app_user with the caller's identity set.
    // Every org/tenant query in the API goes through here.
    async withUser(userId, fn) {
      return db.transaction(async (tx) => {
        await tx.query('select set_config($1, $2, true)', ['app.user_id', userId || '']);
        await tx.exec('set local role app_user');
        return fn({
          async query(sql, params) { return (await tx.query(sql, params)).rows; },
        });
      });
    },
    async close() { await db.close(); },
  };
}

export async function migrate(db, log = () => {}) {
  const files = readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();
  await db.system(`create table if not exists public._migrations (
    name text primary key, applied_at timestamptz not null default now())`);
  for (const f of files) {
    const done = await db.system('select 1 from _migrations where name = $1', [f]);
    if (done.length) continue;
    log(`applying ${f}`);
    await db.raw.transaction(async (tx) => {
      await tx.exec(readFileSync(join(MIGRATIONS_DIR, f), 'utf8'));
      await tx.query('insert into _migrations (name) values ($1)', [f]);
    });
  }
}
