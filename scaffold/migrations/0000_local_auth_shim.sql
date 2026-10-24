-- ============================================================================
-- 0000_local_auth_shim.sql (LOCAL DEV ONLY)
-- ----------------------------------------------------------------------------
-- Provides what Supabase already provides in production, so the SAME
-- migrations and RLS policies run unchanged in both places:
--   * auth.users table (production: Supabase Auth owns it; the API adapter
--     calls Supabase instead of inserting here. Guarded with if-not-exists.)
--   * auth.uid() function (production: Supabase built-in; guarded, not
--     overwritten). Locally reads the per-transaction GUC app.user_id which
--     the API layer sets before SET LOCAL ROLE app_user.
--   * app_user role: NOBYPASSRLS, the role every request runs as, so RLS is
--     genuinely enforced in dev, not decorative.
-- Skipped automatically in production by the guards; harmless if re-run.
-- ============================================================================
create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  encrypted_password text,
  email_verified_at timestamptz,
  created_at timestamptz not null default now()
);

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
