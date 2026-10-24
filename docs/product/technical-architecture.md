# Technical Architecture (Proposed)

Status: PROPOSED, pending founder confirmation of Blocker B1 (which repository the platform is built in) and the stack decision. Nothing here is implemented.

## 1. Context and constraint

The audited repository is a static marketing site (see `current-state-audit.md`). The live production site runs a separate, more advanced codebase (`turn2law-operations-v2` on Vercel per the PRD, unverified). Therefore this document proposes an architecture for a **new platform build**, designed so that:

- the existing marketing pages are preserved or ported with minimal churn;
- if the production repo is later provided, its Doc Engine wizard and any assets can be adopted into this architecture rather than rewritten.

## 2. Recommended stack (decision A1)

Chosen for continuity with the PRD's operational signals (Vercel + Supabase), hiring feasibility, and the static site already deployed on Vercel.

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | Vite + React + TypeScript | Marketing pages port cheaply; app shell, admin, and pillar UIs share one toolchain. Alternative considered: Next.js; rejected as a rewrite of more moving parts with no SSR requirement identified |
| Hosting | Vercel (frontend + serverless functions) | Already in use for the static site; CI/CD and preview deploys included |
| API | Serverless functions first (Vercel), extracted to a Node service only if long-running work demands it | Simplest maintainable design per PRD 8.1; wizard PDF/signing jobs are the likely extraction trigger |
| Database | Postgres via Supabase | System of record; RLS gives defence-in-depth tenant isolation alongside API-layer scoping |
| Auth | Supabase Auth (email/password, verification, reset) with server-side session handling in the API layer | PLT-001 to PLT-003 without custom crypto; MFA added at PLT-004 |
| Storage | Supabase Storage, private buckets, signed URLs | PLT-014 |
| Background jobs | `pg-boss` on the same Postgres (ingestion, indexing, OCR, generation, notifications, reminders) | One queue system, visible job state, no extra vendor; RES-025 |
| Search | Postgres FTS at MVP, `pgvector` added for hybrid retrieval (INT-010) | No search vendor until scale demands it |
| AI | Provider-agnostic adapter (OpenAI-compatible interface) behind a server boundary; per-pipeline prompts versioned in the DB, never in client bundles | PRD 8.4; provider terms are a founder decision (D3) |
| Payments | Razorpay adapter, server-verified webhooks only (LS-022) | Confirm account credentials (C1) |
| Email | Transactional provider adapter (Resend or SES) | C1 |
| WhatsApp | Adapter boundary only at MVP; clearly labelled unavailable until a provider is approved | PRD rule 10 |

All external providers sit behind interfaces with a **labelled development adapter** (deterministic, clearly marked `DEV` in UI and logs). No integration is reported live until tested against the real provider.

## 3. System shape

    Browser
      ├── Public marketing (ported static pages, served as-is at first)
      ├── Authenticated user app  (dashboard, Legal Services, Doc Engine, Introspector)
      ├── Admin console (/admin, server-authorized routes)
      └── (later) public Resources reading from DB + index
    API layer (serverless functions, one authZ guard pipeline)
      ├── accounts / orgs / rbac / sessions
      ├── services / orders / matters / payments / compliance
      ├── docengine (templates, drafts, versions, exports, signing)
      ├── introspector (sessions, retrieval, citations, briefs)
      ├── resources (catalog, search, editorial workflow)
      ├── admin (all pillars' configuration)
      └── webhooks (razorpay, esign) + audit writer
    Workers (pg-boss): ingestion, enrichment, indexing, OCR, generation,
      notifications, compliance reminders, analytics rollups
    Postgres (RLS: org_id scoping) + Storage + FTS/pgvector
    Providers: razorpay*, email*, whatsapp*, esign*, ai*, search*
               (* behind adapters; dev adapter until credentials)

## 4. Repository layout (proposed)

Monorepo in this repository if the founder builds here (B1 option 2):

    / (root)
      docs/product/          Phase 0 documents (this set)
      web/                   Vite React app (marketing port + app shell + admin)
      api/                   Serverless functions grouped by domain
      workers/               Job processors
      packages/shared/       Types, zod schemas, permission scopes shared across web/api/workers
      supabase/              Migrations, RLS policies, seed (dev-labelled only)
      infra/                 Env templates, deploy notes

If the founder instead provides `turn2law-operations-v2` (B1 option 1), this layout adapts to that repo's existing structure; the audit of that repo supersedes this document.

## 5. Cross-cutting rules

1. **Authorization pipeline**: every API function passes authenticate, resolve org context, resolve scopes, validate (zod), rate-limit, then execute with org-scoped queries. Hidden navigation is never the control (PLT-011).
2. **Tenant isolation**: every domain table carries `org_id`; Postgres RLS policies enforce it as a second layer (PLT-012).
3. **Audit**: one append-only `audit_log` writer used by all sensitive paths (PLT-019, ADM-110).
4. **Idempotency**: order creation and payment callbacks require client-supplied idempotency keys (LS-023).
5. **Configuration over code**: services, prices, templates, clauses, categories, workflow states, sources, and reminder schedules live in the DB and are editable in admin (PRD rule 6).
6. **Brand tokens** as code constants in `packages/shared`: gold `#D8AB5B`, ink `#111111`, gray `#6F6F6F`, line `#EAEAEA`, navy `#0A1628` (dark product UI only), Poppins/Inter/DM Mono, SVG line icons, one gold accent per screen, no em dashes.
7. **Environments**: `local` (dev adapters, seeded data clearly labelled DEV), `staging` (real providers where credentials exist), `production`. No sample data in production (PRD rule 3).

## 6. Environment variables (full list, C1)

    DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
    SESSION_SECRET, APP_URL
    RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET
    EMAIL_PROVIDER_API_KEY, EMAIL_FROM
    WHATSAPP_PROVIDER_*        (optional, later)
    ESIGN_PROVIDER_*           (optional, later)
    AI_PROVIDER_API_KEY, AI_PROVIDER_MODEL_*, AI_PROVIDER_BASE_URL
    STORAGE_BUCKET_*
    AUDIT_WEBHOOK_URL          (optional, ops alerting)

Secrets live in Vercel encrypted env / Supabase vault only; never in the client bundle or ordinary logs (ADM-090, PRD 8.5).
