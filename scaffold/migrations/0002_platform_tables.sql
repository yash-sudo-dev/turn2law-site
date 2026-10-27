-- ============================================================================
-- 0002_platform_tables.sql: Legal Services, Resources, Doc Engine seam,
-- Introspector. Org-scoped with RLS like the foundation. Admin/system
-- operations that must cross orgs run through the API's system layer with
-- scope checks and audit; request-role policies enforce tenant isolation.
-- ============================================================================

-- ---------------------------------------------------------------- Resources
create table if not exists public.resource_categories (
  id int primary key generated always as identity,
  name text not null unique, slug text not null unique, sort int not null default 0, active boolean not null default true
);
insert into public.resource_categories (name, slug, sort) values
  ('Legal News','news',1),('Case Law','case-law',2),('Acts and Regulations','acts',3),
  ('Government Portals','portals',4),('Templates','templates',5),('Guides','guides',6),
  ('Legal Events','events',7),('Glossary','glossary',8)
on conflict (name) do nothing;

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  name text not null, url text not null,
  source_type text not null default 'manual' check (source_type in ('rss','api','opendata','court_db','connector','manual')),
  authority text, category_id int references public.resource_categories(id),
  reliability_tier text not null default 'unverified',
  refresh_interval_minutes int not null default 1440,
  permitted_method text not null default 'manual',
  licensing_notes text not null default 'Unverified. No automated fetch until licensed (decision D2).',
  attribution_required boolean not null default true,
  attribution_text text,
  last_success_at timestamptz, next_run_at timestamptz,
  health text not null default 'unlicensed' check (health in ('unlicensed','healthy','failing','paused')),
  failure_count int not null default 0, enabled boolean not null default false,
  reviewer_id uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.ingestion_jobs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.sources(id),
  kind text not null default 'manual',
  state text not null default 'queued' check (state in ('queued','running','succeeded','failed','dead')),
  queued_at timestamptz not null default now(), started_at timestamptz, finished_at timestamptz, error text
);

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  org_id uuid,  -- NULL: public content; set for org-private drafts if ever needed
  category_id int references public.resource_categories(id),
  kind text not null default 'article',
  title text not null, slug text not null unique,
  summary text not null default '', body text not null default '',
  source_id uuid references public.sources(id),
  source_url text, source_published_at timestamptz, effective_date timestamptz,
  last_verified_at timestamptz,
  verification_status text not null default 'unverified' check (verification_status in ('unverified','editor_verified')),
  review_status text not null default 'draft' check (review_status in ('draft','in_review','approved','published','archived')),
  author_id uuid references public.profiles(id),
  reviewer_id uuid references public.profiles(id),
  seo jsonb not null default '{}'::jsonb, featured boolean not null default false,
  content_hash text, version int not null default 1,
  published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists resources_status_idx on public.resources(review_status, published_at desc);
create index if not exists resources_category_idx on public.resources(category_id);

create table if not exists public.resource_versions (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  version int not null, snapshot jsonb not null,
  editor_id uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.bookmarks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, resource_id)
);

create table if not exists public.search_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  query text not null, results_count int not null default 0,
  created_at timestamptz not null default now()
);

-- Ingestion staging: the manual connector's input queue (decision D2).
create table if not exists public.source_items (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources(id) on delete cascade,
  title text not null, url text, summary text not null default '',
  body text not null default '', published_at timestamptz,
  content_hash text not null,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------ Legal Services
create table if not exists public.service_categories (
  id int primary key generated always as identity,
  name text not null unique, slug text not null unique, sort int not null default 0, active boolean not null default true
);
insert into public.service_categories (name, slug, sort) values
  ('Incorporation','incorporation',1),('Business Registrations','registrations',2),
  ('GST','gst',3),('Trademark and IP','trademark-ip',4),('ROC and Annual Compliance','roc-compliance',5),
  ('Fundraising and Advisory','advisory',6),('Employment and HR','employment',7),
  ('Notices and Disputes','disputes',8),('Contract Drafting','contracts',9)
on conflict (name) do nothing;

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  category_id int references public.service_categories(id),
  name text not null, slug text not null unique,
  description text not null default '', scope text not null default '', exclusions text not null default '',
  deliverables jsonb not null default '[]'::jsonb, required_documents jsonb not null default '[]'::jsonb,
  process_steps jsonb not null default '[]'::jsonb, timeline text,
  professional_fee numeric(12,2) not null default 0, government_fee numeric(12,2) not null default 0,
  tax_rate numeric(5,4) not null default 0.18,
  jurisdiction text not null default 'India',
  publication_status text not null default 'draft' check (publication_status in ('draft','published','retired')),
  version int not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.service_versions (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  version int not null, snapshot jsonb not null, editor_id uuid references public.profiles(id),
  change_note text, created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  service_id uuid not null references public.services(id),
  questionnaire_responses jsonb not null default '{}'::jsonb,
  pricing_snapshot jsonb not null default '{}'::jsonb,
  idempotency_key text unique,
  status text not null default 'awaiting_payment'
    check (status in ('draft','awaiting_payment','paid','quote_requested','in_progress','completed','cancelled','refunded')),
  created_at timestamptz not null default now()
);
create index if not exists orders_org_idx on public.orders(org_id, created_at desc);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null default 'dev',
  provider_ref text unique,
  amount numeric(12,2) not null, currency text not null default 'INR',
  status text not null default 'created' check (status in ('created','captured','failed','refunded')),
  verified_at timestamptz, created_at timestamptz not null default now()
);

create table if not exists public.matter_workflow_states (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references public.services(id) on delete cascade,  -- NULL: platform default set
  state_key text not null, label text not null,
  kind text not null default 'internal' check (kind in ('internal','external_authority')),
  order_idx int not null, allowed_transitions jsonb not null default '[]'::jsonb,
  required_actions jsonb not null default '[]'::jsonb,
  unique (service_id, state_key)
);
-- Platform default workflow (LS-031). Service-specific sets configured in admin (LS-032).
insert into public.matter_workflow_states (service_id, state_key, label, kind, order_idx, allowed_transitions) values
  (null,'received','Received','internal',1,'["information_required","under_review","cancelled"]'),
  (null,'information_required','Information Required','internal',2,'["docs_submitted","cancelled"]'),
  (null,'docs_submitted','Documents Submitted','internal',3,'["under_review"]'),
  (null,'under_review','Under Review','internal',4,'["docs_verified","information_required"]'),
  (null,'docs_verified','Documents Verified','internal',5,'["preparation"]'),
  (null,'preparation','Preparation','internal',6,'["filing_ready"]'),
  (null,'filing_ready','Filing Ready','internal',7,'["filed"]'),
  (null,'filed','Filed with Authority','external_authority',8,'["govt_processing"]'),
  (null,'govt_processing','Government Processing','external_authority',9,'["approved","rejected"]'),
  (null,'approved','Approved (authority)','external_authority',10,'["delivered"]'),
  (null,'rejected','Rejected (authority)','external_authority',10,'["delivered"]'),
  (null,'delivered','Delivered','internal',11,'[]'),
  (null,'cancelled','Cancelled','internal',11,'[]')
on conflict do nothing;

create table if not exists public.matters (
  id uuid primary key default gen_random_uuid(),
  order_id uuid unique references public.orders(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  reference text not null unique,
  service_id uuid not null references public.services(id),
  workflow_state text not null default 'received',
  owner_id uuid references public.profiles(id),
  priority text not null default 'normal',
  sla_due_at timestamptz, opened_at timestamptz not null default now(), closed_at timestamptz
);
create index if not exists matters_org_idx on public.matters(org_id);

create table if not exists public.matter_status_events (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  from_state text, to_state text not null,
  actor_id uuid references public.profiles(id), note text,
  created_at timestamptz not null default now()
);

create table if not exists public.matter_documents (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  file_id uuid not null references public.files(id) on delete cascade,
  kind text not null default 'client_upload' check (kind in ('client_upload','internal','deliverable')),
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected')),
  rejection_reason text, version int not null default 1,
  uploaded_by uuid references public.profiles(id), reviewed_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- --------------------------------------------------------- Doc Engine (seam)
-- Per decision B1 the wizard itself is NOT implemented here. These tables are
-- the integration surface: documents the production wizard produces land
-- here via the documented seam contract (see scaffold/docs/docengine-seam.md).
create table if not exists public.doc_records (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid references public.profiles(id),
  template_key text, title text not null,
  status text not null default 'external' check (status in ('external','imported','executed')),
  external_url text, exported_file_id uuid references public.files(id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists doc_records_org_idx on public.doc_records(org_id, created_at desc);

-- Admin-configurable integrations (wizard base URL etc). Non-secret config only.
create table if not exists public.integrations (
  key text primary key, config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(), updated_by uuid references public.profiles(id)
);
insert into public.integrations (key, config) values
  ('docengine.wizard', '{"base_url": null, "note": "Production wizard URL not yet linked. Decision B1: never rebuilt here."}'),
  ('payments.provider', '{"provider": "dev", "note": "Razorpay keys pending (decision C1 order)."}'),
  ('mail.provider', '{"provider": "dev-unconfigured"}'),
  ('ai.provider', '{"provider": "unconfigured", "no_training_terms_required": true}')
on conflict (key) do nothing;

-- ------------------------------------------------------------ Introspector
create table if not exists public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.sources(id),
  doc_type text not null default 'act' check (doc_type in ('act','judgment','rule','notification','regulation')),
  title text not null, citation text,
  court text, jurisdiction text, dated timestamptz,
  content text not null default '',
  content_hash text not null,
  provenance jsonb not null default '{}'::jsonb,
  ingested_at timestamptz not null default now(), last_verified_at timestamptz
);
create index if not exists legal_docs_fts_idx on public.legal_documents using gin (to_tsvector('english', title || ' ' || content));

create table if not exists public.research_matters (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  title text not null, created_by uuid references public.profiles(id),
  tags jsonb not null default '[]'::jsonb, created_at timestamptz not null default now()
);

create table if not exists public.research_sessions (
  id uuid primary key default gen_random_uuid(),
  research_matter_id uuid not null references public.research_matters(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  title text not null default 'New session', created_at timestamptz not null default now()
);

create table if not exists public.research_queries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.research_sessions(id) on delete cascade,
  question text not null,
  answer_md text, limitation text, confidence text,
  created_at timestamptz not null default now()
);

create table if not exists public.retrieved_sources (
  id uuid primary key default gen_random_uuid(),
  query_id uuid not null references public.research_queries(id) on delete cascade,
  legal_document_id uuid not null references public.legal_documents(id),
  passage text not null, rank int not null
);

create table if not exists public.citations (
  id uuid primary key default gen_random_uuid(),
  query_id uuid not null references public.research_queries(id) on delete cascade,
  legal_document_id uuid not null references public.legal_documents(id),
  case_name text, citation_id text, court text, dated timestamptz,
  paragraph text, quoted_passage text, url text,
  verified boolean not null default false, retrieved_at timestamptz not null default now()
);

-- ============================================================================
-- RLS: pillar tables. Client-visible rows are org-scoped; catalog/public
-- content is world-readable at the API layer with policies permitting read.
-- ============================================================================
alter table public.resources enable row level security;
alter table public.matters enable row level security;
alter table public.orders enable row level security;
alter table public.matter_documents enable row level security;
alter table public.matter_status_events enable row level security;
alter table public.doc_records enable row level security;
alter table public.research_matters enable row level security;
alter table public.research_sessions enable row level security;
alter table public.research_queries enable row level security;
alter table public.bookmarks enable row level security;

create policy resources_public_read on public.resources for select
  using (review_status = 'published' or public.is_org_member(org_id));
create policy matters_isolate on public.matters for select
  using (public.is_org_member(org_id));
create policy orders_isolate on public.orders for select
  using (public.is_org_member(org_id));
create policy matter_docs_isolate on public.matter_documents for select
  using (exists (select 1 from public.matters m where m.id = matter_id and public.is_org_member(m.org_id)));
create policy matter_events_isolate on public.matter_status_events for select
  using (exists (select 1 from public.matters m where m.id = matter_id and public.is_org_member(m.org_id)));
create policy doc_records_isolate on public.doc_records for select
  using (public.is_org_member(org_id));
create policy research_matters_isolate on public.research_matters for all
  using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy research_sessions_isolate on public.research_sessions for all
  using (exists (select 1 from public.research_matters rm where rm.id = research_matter_id and public.is_org_member(rm.org_id)))
  with check (exists (select 1 from public.research_matters rm where rm.id = research_matter_id and public.is_org_member(rm.org_id)));
create policy research_queries_isolate on public.research_queries for all
  using (exists (select 1 from public.research_sessions s join public.research_matters rm on rm.id = s.research_matter_id
                 where s.id = session_id and public.is_org_member(rm.org_id)))
  with check (exists (select 1 from public.research_sessions s join public.research_matters rm on rm.id = s.research_matter_id
                 where s.id = session_id and public.is_org_member(rm.org_id)));
create policy bookmarks_own on public.bookmarks for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
