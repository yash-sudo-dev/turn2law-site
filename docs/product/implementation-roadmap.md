# Implementation Roadmap (Proposed)

Status: PROPOSED, pending founder confirmation. Order follows PRD section 9. Each phase has a hard acceptance gate; a phase is not done until its gate passes.

## Blockers and founder decisions (resolve before Phase 1)

- **B1 Repository**: this repo is the static marketing site; the live Doc Engine wizard is in the production codebase. Decide: (1) provide the production repo for the build, or (2) build the platform fresh in this repo and migrate/replace the wizard later. Everything else adapts to this choice.
- **C1 Credentials**: Supabase project (or new), Razorpay account, email provider, AI provider key. Development adapters carry Phase 1 to 3 without them; payments cannot be marked live without Razorpay test+live keys.
- **D1 Payment provider confirmation** (Razorpay assumed).
- **D2 Licensed sources** for Introspector and Resources ingestion; none verified yet.
- **D3 AI provider and data-handling terms** (which models may receive user or document content).
- **D4 Content truth**: confirm which marketing metrics/testimonials are real; unverifiable ones are removed from production surfaces (PRD rule 3).
- **D5 GST**: no GSTIN is shown anywhere until the founder confirms GSTIN status (PRD section 11).

## Phase 0 (done with this document set)

Audit, PRD-derived requirements per pillar, architecture proposal, schema, API conventions, ingestion design, security requirements, roadmap, acceptance plan.

## Phase 1: Shared foundation (PLT P0)

Auth (signup, verify, login, sessions, reset), profiles, organizations and invitations, RBAC scope enforcement middleware, private storage with signed URLs, notifications service (in-app + email adapter), audit log writer, rate limiting, web app shell (marketing pages ported, authenticated layout), CI with tests.

Gate: two orgs cannot see each other's data in automated tests; session revocation works; audit rows exist for every sensitive action; marketing pages still serve.

## Phase 2: Admin auth and permissions (ADM P0)

Admin console shell, scope-based routes, users/orgs module, audit viewer, feature flags, integration settings screens (write-only secrets).

Gate: a user without `users.manage` receives 403 on every admin route server-side; all sensitive actions audited.

## Phase 3: Resources CMS and ingestion (RES P0, RES-022/026 P1)

Editorial workflow (draft, review, approve, publish, schedule, archive, rollback), categories, tags, collections, public read APIs from DB, search (FTS) with filters and pagination, source registry, ingestion pipeline with manual_editorial connector (DEV-labelled), dedupe, health screens. One real feed enabled only after licensing verification.

Gate: editor creates and reviewer approves an article; ingested DEV items dedupe on re-run; failed fetch retries and surfaces; public page reads from DB with no synchronous scraping; unauthorised publish blocked server-side.

## Phase 4: Legal Services (LS P0, then P1)

Catalogue admin, service detail pages from DB, order journey with questionnaire and idempotency, Razorpay adapter with server-verified webhooks (dev adapter until C1), client dashboard with configurable workflow states and matter timeline, document exchange with verification states, internal ops dashboard (assignment, transitions), compliance calendar v1.

Gate: order to delivery journey passes with payment verified only via webhook signature; a faked success URL never marks an order paid; internal states never imply government approval (LS-033).

## Phase 5: Doc Engine (DOC P0, then P1)

Port or rebuild the wizard flow per B1 decision; templates and clause library admin with approvals; questionnaire, confirm, generate (versioned clause assembly), validation, editable preview with risk flags (P1), versioning, PDF/DOCX export, signature adapter boundary (existing PKCS#12 flow adopted if B1 option 1).

Gate: template to exported document end to end; only approved templates generatable in production; drafts are org-isolated; every version restorable.

## Phase 6: Introspector (INT P0 on first sources, rest P1/P2)

Workspace UI, research sessions, hybrid retrieval over ingested legal documents (Phase 3 pipeline extended), grounded answers with per-claim citations and limitation statements, citation validation, feedback loop, eval harness. Provision mappings, case files, and briefs after sources land (D2).

Gate: a query returns only citations present in stored records; fabricated-citation test cases are rejected; missing evidence yields an honest limitation; eval run recorded.

## Phase 7: Integrations and ops (P1 to P2)

WhatsApp (if approved provider), e-signature provider integration, analytics rollups, monitoring and alerting, operational reporting.

## Phase 8: Hardening and launch readiness

Load and failure testing, external security review, DPDP counsel review, content truth pass (D4), launch checklist.

## Explicitly deferred (not P0, do not build early)

Auto-publish of AI legal summaries; citation treatment intelligence (INT-030/031) before source data exists; e-signature compliance claims before provider capability confirmed; GSTIN display (D5); any scraping of sources without verified permission.
