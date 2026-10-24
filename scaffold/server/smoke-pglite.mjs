// PGlite capability smoke test: real RLS enforcement locally via a
// non-superuser role (app_user), auth.uid() GUC shim, and a security-definer
// org-membership helper. This mirrors exactly how scaffold/migrations run.
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
await db.exec(`
  create schema if not exists auth;
  do $$ begin
    if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                   where n.nspname = 'auth' and p.proname = 'uid') then
      execute $fn$
        create function auth.uid() returns uuid language sql stable as
        $body$ select nullif(current_setting('app.user_id', true), '')::uuid $body$;
      $fn$;
    end if;
  end $$;

  do $$ begin
    if not exists (select from pg_roles where rolname = 'app_user') then
      create role app_user nologin nobypassrls;
    end if;
  end $$;

  create table t_org (id uuid primary key default gen_random_uuid(), name text);
  create table t_member (org_id uuid references t_org(id), user_id uuid);
  create table t_doc (id uuid primary key default gen_random_uuid(),
    org_id uuid references t_org(id), title text);

  create or replace function is_member(target_org uuid) returns boolean
    language sql security definer stable set search_path = public as $$
    select exists (select 1 from t_member where org_id = target_org and user_id = auth.uid());
  $$;

  alter table t_doc enable row level security;
  create policy t_doc_isolate on t_doc for all
    using (is_member(org_id)) with check (is_member(org_id));

  grant usage on schema public to app_user;
  grant select, insert on t_doc to app_user;
  grant execute on function is_member(uuid) to app_user;

  insert into t_org (name) values ('orgA'), ('orgB');
`);
const orgA = (await db.query("select id from t_org where name='orgA'")).rows[0].id;
const orgB = (await db.query("select id from t_org where name='orgB'")).rows[0].id;
const userA = crypto.randomUUID(), userB = crypto.randomUUID();
await db.query('insert into t_member (org_id, user_id) values ($1,$2),($3,$4)', [orgA, userA, orgB, userB]);

async function asUser(uid, sql, params = []) {
  return db.transaction(async (tx) => {
    await tx.exec(`select set_config('app.user_id', '${uid}', true)`);
    await tx.exec('set local role app_user');
    return tx.query(sql, params);
  });
}

await asUser(userA, 'insert into t_doc (org_id, title) values ($1,$2)', [orgA, 'A doc']);
await asUser(userB, 'insert into t_doc (org_id, title) values ($1,$2)', [orgB, 'B doc']);

const seenByA = (await asUser(userA, 'select title from t_doc')).rows.map(r => r.title);
const seenByB = (await asUser(userB, 'select title from t_doc')).rows.map(r => r.title);
let crossWriteBlocked = false;
try { await asUser(userB, "insert into t_doc (org_id,title) values ($1,'B into A')", [orgA]); }
catch { crossWriteBlocked = true; }
let crossReadBlocked = false;
try { await asUser(userB, "select title from t_doc where org_id = $1", [orgA]); }
catch { crossReadBlocked = true; }

const pass = seenByA.join() === 'A doc' && seenByB.join() === 'B doc' && crossWriteBlocked;
console.log(JSON.stringify({ pglite: 'ok', rlsIsolationWorks: pass, crossOrgWriteBlocked: crossWriteBlocked, crossOrgRowsLeaked: seenByB.length !== 1 }));
process.exit(pass ? 0 : 1);
