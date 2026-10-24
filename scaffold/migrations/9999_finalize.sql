-- ============================================================================
-- 9999_finalize.sql: run last after every migration.
-- Grants for the request role app_user (NOBYPASSRLS). The API always runs
-- request-scoped work as app_user with app.user_id set, so RLS is enforced.
-- System work (migrations, seeding, job runner bookkeeping) runs as the
-- owner and is confined to the db layer.
-- ============================================================================
grant usage on schema public to app_user;
grant usage, select on all sequences in schema public to app_user;
grant select, insert, update, delete on all tables in schema public to app_user;

-- audit_log stays append-only for the request role (PLT-019, ADM-110)
revoke update, delete on public.audit_log from app_user;

-- default privileges for future migrations
alter default privileges in schema public
  grant select, insert, update, delete on tables to app_user;
alter default privileges in schema public
  grant usage, select on sequences to app_user;
