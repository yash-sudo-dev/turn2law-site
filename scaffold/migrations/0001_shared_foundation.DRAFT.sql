-- ============================================================================
-- Turn2Law shared foundation, baseline DRAFT (PLT-001 to PLT-019)
-- ----------------------------------------------------------------------------
-- SCAFFOLD per decision B1. Repo-agnostic by design: plain Postgres/Supabase,
-- no framework dependency. DRAFT means: apply only AFTER the production
-- repository audit; where the production Supabase project already defines
-- equivalent tables, adapt or discard sections rather than duplicating.
-- Written to be idempotent: safe to re-run, safe to partially adopt.
-- Assumes the Supabase auth schema (auth.users) is present.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Identity (PLT-001, PLT-005, PLT-008)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  name               text not null default '',
  phone              text,
  avatar_url         text,
  notification_prefs jsonb not null default '{}'::jsonb,
  language           text not null default 'en',
  status             text not null default 'active'
                       check (status in ('active','suspended','deletion_requested')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RBAC role catalog (PLT-010). Must exist before org_members references it.
-- ---------------------------------------------------------------------------
create table if not exists public.roles (
  key         text primary key,
  description text
);

insert into public.roles (key, description) values
  ('visitor','Anonymous visitor'),
  ('registered_user','Authenticated user, no org role'),
  ('founder','Founder or business owner, client org'),
  ('lawyer','Advocate or lawyer'),
  ('firm_member','Law firm member'),
  ('corporate_legal','Corporate legal team member'),
  ('client_org_admin','Client organization administrator'),
  ('content_editor','Content editor'),
  ('content_reviewer','Content reviewer'),
  ('legal_reviewer','Legal reviewer'),
  ('support','Customer support'),
  ('ops_manager','Operations manager'),
  ('finance_manager','Finance manager'),
  ('internal_team','Internal team member'),
  ('product_admin','Product admin'),
  ('super_admin','Super admin')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Organizations and membership (PLT-006)
-- ---------------------------------------------------------------------------
create table if not exists public.organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  type       text not null default 'client' check (type in ('client','firm','internal')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.org_members (
  org_id        uuid not null references public.organizations(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  role          text not null references public.roles(key),
  member_status text not null default 'invited'
                  check (member_status in ('invited','active','suspended')),
  invited_by    uuid references public.profiles(id),
  invited_at    timestamptz,
  joined_at     timestamptz,
  primary key (org_id, user_id)
);

create table if not exists public.invitations (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  email       text not null,
  role        text not null references public.roles(key),
  token_hash  text not null unique,
  expires_at  timestamptz not null,
  accepted_at timestamptz,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RBAC scope assignments (ADM-100).
-- ---------------------------------------------------------------------------
create table if not exists public.role_scopes (
  role  text not null references public.roles(key) on delete cascade,
  scope text not null,
  primary key (role, scope)
);
-- Seed intentionally EMPTY: assignments load from permissions/scopes.csv during
-- Phase 1 bootstrapping so the CSV stays the single source of truth.

-- ---------------------------------------------------------------------------
-- Sessions and device history (PLT-002, PLT-007)
-- Supabase Auth owns the primary session; this table records revocable
-- device entries for the user's session history UI.
-- ---------------------------------------------------------------------------
create table if not exists public.sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  token_hash  text not null,
  device_label text,
  ip_hash     text,
  user_agent  text,
  created_at  timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at  timestamptz
);
create index if not exists sessions_user_idx on public.sessions(user_id);

-- ---------------------------------------------------------------------------
-- Files (PLT-014). Metadata only; bytes live in private object storage.
-- Downloads must go through short-lived signed URLs issued by the API layer.
-- ---------------------------------------------------------------------------
create table if not exists public.files (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  uploader_id uuid not null references public.profiles(id),
  bucket      text not null,
  path        text not null,
  filename    text not null,
  mime        text not null,
  size        bigint not null check (size >= 0),
  sha256      text,
  scan_status text not null default 'pending'
                check (scan_status in ('pending','clean','flagged','skipped')),
  created_at  timestamptz not null default now()
);
create index if not exists files_org_idx on public.files(org_id);

-- ---------------------------------------------------------------------------
-- Notifications (PLT-015)
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid references public.organizations(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  channel       text not null check (channel in ('inapp','email','whatsapp')),
  template_key  text not null,
  payload       jsonb not null default '{}'::jsonb,
  status        text not null default 'queued'
                  check (status in ('queued','sent','failed','skipped')),
  attempts      int not null default 0,
  last_error    text,
  sent_at       timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, status);

create table if not exists public.notification_preferences (
  user_id uuid not null references public.profiles(id) on delete cascade,
  channel text not null check (channel in ('inapp','email','whatsapp')),
  topic   text not null,
  opted_in boolean not null default true,
  primary key (user_id, channel, topic)
);

-- ---------------------------------------------------------------------------
-- Audit log (PLT-019, ADM-110). APPEND-ONLY: no policy grants UPDATE/DELETE.
-- ---------------------------------------------------------------------------
create table if not exists public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid references public.organizations(id) on delete set null,
  actor_id    uuid references public.profiles(id),
  actor_role  text,
  action      text not null,           -- e.g. auth.login, matter.transition, refund.approve
  entity_type text not null,
  entity_id   text,
  before      jsonb,
  after       jsonb,
  ip_hash     text,
  created_at  timestamptz not null default now()
);
create index if not exists audit_org_created_idx on public.audit_log(org_id, created_at desc);
create index if not exists audit_action_idx on public.audit_log(action);
create index if not exists audit_entity_idx on public.audit_log(entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- Consents, saved items, feature flags (PLT-017, PLT-019, PLT-020)
-- ---------------------------------------------------------------------------
create table if not exists public.consents (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete cascade,
  org_id     uuid references public.organizations(id) on delete cascade,
  kind       text not null,
  granted    boolean not null,
  evidence   jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.saved_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  org_id     uuid references public.organizations(id) on delete cascade,
  item_type  text not null check (item_type in ('service','document','research','resource')),
  item_id    text not null,
  created_at timestamptz not null default now(),
  unique (user_id, item_type, item_id)
);

create table if not exists public.feature_flags (
  key      text primary key,
  enabled  boolean not null default false,
  rollout  jsonb not null default '{}'::jsonb
);

-- ============================================================================
-- Row level security. org_id scoping is the second layer; the API layer
-- remains the primary enforcement point (PLT-011, PLT-012).
-- Helper: is the caller an active member of the org?
-- ============================================================================
create or replace function public.is_org_member(target_org uuid)
returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.org_members
    where org_id = target_org
      and user_id = auth.uid()
      and member_status = 'active'
  );
$$;

alter table public.org_members enable row level security;
alter table public.invitations enable row level security;
alter table public.files enable row level security;
alter table public.notifications enable row level security;
alter table public.sessions enable row level security;
alter table public.profiles enable row level security;
alter table public.audit_log enable row level security;
alter table public.saved_items enable row level security;
alter table public.consents enable row level security;

-- members see their own membership rows and fellow members of their orgs
create policy org_members_read on public.org_members for select
  using (user_id = auth.uid() or public.is_org_member(org_id));

-- invitations visible to the org's members, management via API service role
create policy invitations_read on public.invitations for select
  using (public.is_org_member(org_id));

-- org-scoped tables: members read their org's rows; writes go through the API
-- (service role), which enforces scopes and writes audit events
create policy files_read on public.files for select
  using (public.is_org_member(org_id));
create policy notifications_read on public.notifications for select
  using (user_id = auth.uid() or public.is_org_member(org_id));

-- personal rows: strictly own
create policy profiles_rw on public.profiles for all
  using (id = auth.uid()) with check (id = auth.uid());
create policy sessions_own on public.sessions for select
  using (user_id = auth.uid());
create policy saved_own on public.saved_items for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy consents_own on public.consents for select
  using (user_id = auth.uid());

-- audit: INSERT via service role only; SELECT for audit readers is granted by
-- the API layer after scope checks (audit.read). No UPDATE/DELETE policies
-- exist on purpose; also hard-revoke at the grant level:
revoke update, delete on public.audit_log from authenticated, anon;
