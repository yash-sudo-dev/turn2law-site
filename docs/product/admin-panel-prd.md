# Admin Panel PRD (ADM)

Status: carried from the Platform PRD v1.0 section 7 with repository status (all NONE; no admin exists anywhere).

## Objective

A single secure internal console at `/admin` controlling all pillars and shared operations. Server-side authorization on every route; hidden navigation is never the control. Professional B2B SaaS console, brand tokens apply (navy reserved for this dark product UI is acceptable per brand rules).

## Dashboard (ADM-001 to ADM-010, P0 to P1)

Operational overview from real data only: user and org counts; orders and active matters; matters awaiting assignment; overdue tasks and SLA breaches; pending document reviews; documents awaiting approval; resource publication and ingestion activity; failed source jobs and freshness; Introspector usage and quality signals; Doc Engine generation activity; revenue and payment status for authorised roles; system and integration health; recent admin activity. Date filters, drill-downs, links to records. No invented sample metrics in production.

## Modules

| Module | Scope | Key IDs |
|---|---|---|
| A. Users and orgs | Search, account and org detail, roles and permissions, invite staff and users, suspend/reactivate, membership, access history, deletion requests, escalations, org isolation; sensitive actions audited | ADM-020 |
| B. Website and CMS | Homepage content, nav, footer, sections, announcements, testimonials, FAQs, SEO, contact details, policies, media, scheduling, publish/rollback; structured blocks, no arbitrary code editor | ADM-030 |
| C. Legal Services | Catalogue, categories, packages, prices with versioning, questionnaires, eligibility, required docs, workflow templates, assignment rules, SLA settings, order management, quotes/invoices, payment and refund visibility, compliance rules and calendar config, communications, analytics | ADM-040 |
| D. Introspector | Source connectors, ingestion, index health, retrieval config, prompt and model versions, eval runs, citation validation results, error reports, usage limits, feedback, security, retention | ADM-050 |
| E. Doc Engine | Templates, clause library, versions, approvals, risk rules, generation settings, quality checks, failed-generation logs, signature settings, usage and cost, retention | ADM-060 |
| F. Resources | Create/edit/approve/publish/schedule/archive/restore; categories, collections; source registry and config; manual syncs; job health; retries; duplicate resolution; AI summary approval; freshness; search analytics | ADM-070 |
| G. Communications | Email templates, in-app notifications, WhatsApp templates, trigger rules, delivery status and retry, preferences, transactional vs marketing classification, consent and opt-out | ADM-080 |
| H. Integrations and settings | Payment, email, WhatsApp, e-signature, AI, search, storage, analytics, webhooks, scheduled jobs, feature flags, environment and health; secrets server-side, write-only, never exposed | ADM-090 |

## Roles and permissions (ADM-100, P0)

Granular scopes, assigned to roles (PRD 2.2 role list), per org and per matter:
`resources.read/create/edit/review/publish`, `sources.manage`, `ingestion.run`, `services.manage`, `orders.read/assign/update`, `payments.read`, `refunds.approve`, `documents.review`, `templates.manage`, `introspector.sources.manage`, `users.manage`, `roles.manage`, `audit.read`, `settings.manage`.

Least privilege; separation of duties; sensitive actions logged; critical operations may require reauthentication or dual approval (e.g. refunds, source licensing changes).

## Audit and reporting (ADM-110, P0)

Searchable, append-only: authentication and access, permission changes, resource publication and edits, source config changes, order and matter transitions, document approvals, refunds and payment administration, integration config, data exports, security-sensitive actions. Protected from ordinary administrator modification where practical (INSERT-only policies).

## Build sequencing

Phase 2 delivers the shell, auth, scope enforcement, users/orgs, audit viewer, and settings screens. Modules C to F land with their pillar phases (4 to 6). B and G follow in Phase 7. Nothing here is P0 before the foundation exists.
