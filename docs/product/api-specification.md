# API Specification (Proposed, representative)

Status: PROPOSED. Full OpenAPI generation follows in Phase 1 alongside the first real endpoints. Conventions below are binding for all endpoints.

## Conventions

- Base: `/api`. JSON only. Errors: `{ error: { code, message, fields? } }` with proper status codes.
- Auth: httpOnly session cookie; every endpoint resolves user, org context, and scopes server-side (PLT-011). 401 unauthenticated, 403 unauthorised, 404 used instead of 403 where existence itself is secret (no IDOR, PLT-012).
- Validation: zod schemas shared with the frontend (packages/shared).
- Rate limits: auth endpoints strict (per-IP + per-account), public writes CAPTCHA-able, authenticated reads standard (PLT-009).
- Idempotency: `Idempotency-Key` header required on order creation and payment initiation; webhooks idempotent by provider event id (LS-023).
- Pagination: cursor-based (`?cursor=&limit=`).

## Identity and orgs

| Method | Path | Scope | Notes |
|---|---|---|---|
| POST | /auth/signup | public | Creates user + personal org; sends verification (PLT-001) |
| POST | /auth/login, /auth/logout, /auth/refresh | public/self | PLT-002 |
| POST | /auth/password-reset, /auth/password-reset/confirm | public | Single-use, time-limited (PLT-003) |
| GET/PATCH | /me | self | Profile (PLT-005) |
| GET | /me/sessions, DELETE /me/sessions/:id | self | Revoke session (PLT-007) |
| POST | /orgs, POST /orgs/:id/invites, POST /orgs/invites/:token/accept | org scopes | PLT-006 |
| GET | /me/orgs, POST /me/orgs/:id/switch | self | Org switching |

## Legal Services

| Method | Path | Scope | Notes |
|---|---|---|---|
| GET | /services (search, filters, sort) | public read | Catalogue from DB, admin-managed (LS-010) |
| GET | /services/:slug | public read | Full detail incl. price breakdown (LS-011) |
| POST | /services/:slug/eligibility | public | Eligibility check (LS-012) |
| POST | /orders | order:create | Body: service, questionnaire responses, addons, `Idempotency-Key` (LS-020) |
| POST | /orders/:id/payments | order:create | Creates provider payment; returns client token |
| POST | /webhooks/razorpay | provider signature | Server-side verification; only path that may mark paid (LS-022) |
| POST | /payments/verify | system | Re-verify against provider if webhook missed |
| GET | /matters, /matters/:id | matter:read (own org) | Client dashboard (LS-030) |
| POST | /matters/:id/documents | matter:write | Client upload (LS-034) |
| POST | /matters/:id/transition | matter:transition | Enforces configured workflow (LS-031/032) |
| GET | /compliance/obligations, POST /compliance/obligations/:id/ack | compliance:read | LS-051/052 |
| Admin | /admin/services, /admin/workflows, /admin/orders, /admin/matters, /admin/refunds | services:manage etc. | ADM-040 |

## Doc Engine

| Method | Path | Scope | Notes |
|---|---|---|---|
| GET | /docengine/templates | public read | Approved templates only (DOC-003) |
| POST | /docengine/drafts | draft:create | Creates questionnaire draft (DOC-010) |
| PATCH | /docengine/drafts/:id/answers | draft:write | Autosave, questionnaire + clarify (DOC-011/012) |
| POST | /docengine/drafts/:id/confirm | draft:write | Locks summary (DOC-013) |
| POST | /docengine/drafts/:id/generate | draft:write | Assembles from clause library; records pipeline version (DOC-014) |
| GET | /docengine/drafts/:id/versions, /versions/:n | draft:read | DOC-020 |
| PATCH | /docengine/drafts/:id/versions/:n | draft:write | Edits create a new version |
| POST | /docengine/drafts/:id/export | draft:write | PDF/DOCX; authorized formats only (DOC-019) |
| POST | /docengine/drafts/:id/signature | draft:write | Provider adapter; dev adapter labelled (DOC-052) |
| POST | /docengine/drafts/:id/review-request | draft:write | DOC-018 |
| Admin | /admin/docengine/templates, /clauses, /approvals, /risk-rules | templates:manage | ADM-060 |

## Introspector

| Method | Path | Scope | Notes |
|---|---|---|---|
| GET/POST | /research/matters, /research/sessions | research:read/write | INT-001/002 |
| POST | /research/sessions/:id/queries | research:write | Runs retrieval-then-generation; returns answer, citations, limitations, confidence (INT-020/021/024) |
| GET | /research/queries/:id | research:read | Full provenance (INT-022) |
| POST | /research/queries/:id/feedback | research:write | Failure reporting |
| GET | /research/citations/:id/validate | research:read | Re-checks citation against stored record |
| GET | /research/mappings?from=IPC&section=… | research:read | INT-040 bidirectional |
| POST | /research/briefs, /research/briefs/:id/export | research:write | INT-060/061 |
| Admin | /admin/introspector/sources, /ingestion, /evals | introspector.sources.manage | ADM-050 |

## Resources

| Method | Path | Scope | Notes |
|---|---|---|---|
| GET | /resources (q, filters, sort, cursor) | public read | Reads DB + index, never live scrape (RES-002, rule 8) |
| GET | /resources/:slug | public read | Detail with provenance (RES-004) |
| POST | /resources/:id/save, DELETE | self | Bookmarks |
| Editor | /editor/resources CRUD, /submit, /approve, /publish, /schedule | resources:* scopes | RES-010/011/012 |
| Admin | /admin/sources CRUD, /admin/ingestion/run, /admin/ingestion/jobs | sources:manage, ingestion:run | RES-020, RES-025 manual sync |

## Admin and platform

| Method | Path | Scope | Notes |
|---|---|---|---|
| GET | /admin/overview | admin read scopes | Real counts only (ADM-001) |
| GET | /admin/users, /admin/orgs, suspend/reactivate | users:manage | ADM-020 |
| GET | /admin/audit?q=… | audit:read | ADM-110 |
| GET/PATCH | /admin/settings/integrations | settings:manage | ADM-090; secrets write-only |
| GET | /health, /admin/jobs, /admin/jobs/:id/retry | ops | Job visibility (RES-025) |
