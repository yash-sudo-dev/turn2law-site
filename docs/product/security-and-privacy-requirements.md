# Security and Privacy Requirements (Proposed)

Status: PROPOSED. Implements PRD 8.5 and the security rules throughout. This document is engineering requirements, not legal advice; qualified Indian counsel must review the regulatory posture before launch (PRD section 11).

## 1. Authentication and session (PLT-001 to PLT-004)

- Email/password with verification; password policy and breach-list screening.
- Sessions: httpOnly, Secure, SameSite cookies; server-side revocation; refresh rotation.
- Password reset: single-use, time-limited, hashed tokens.
- TOTP MFA required for internal, ops, finance, and admin roles; optional for professionals and clients.

## 2. Authorization (PLT-010 to PLT-013)

- Granular scopes (ADM-100 list) resolved server-side on every request; route guards and data-access guards are separate checks.
- Tenant isolation: every query org-scoped; Postgres RLS as second layer; uuid ids with no sequential guessing surface; cross-org object access returns 404.
- Per-matter confidentiality: internal roles have no standing access to client matter content; access is granted per assignment and expires with it.
- Break-glass access: restricted roles, reason required, always audited.

## 3. Data protection

- TLS everywhere; at-rest encryption via provider (Supabase/Postgres).
- Files: private buckets only; short-lived signed URLs; type and size validation; malware scan hook where supported (PLT-014).
- Secrets: server-side env/vault only; never in client bundles, ordinary logs, or analytics (ADM-090).
- Logs and analytics: no document contents, research text, prompts, or confidential material; identifiers hashed where feasible (PRD 8.4/8.5).
- Data deletion: account and org deletion workflow with retention-aware processing and audit trail (PLT-008).

## 4. Application security

- Input validation (zod) and output encoding on every boundary; sanitised HTML storage for CMS bodies (allowlist) plus render-time sanitisation.
- CSRF: SameSite cookies + origin checks on state-changing routes.
- SSRF: connectors fetch only registered source URLs; redirects validated against allowlist; no user-supplied URLs fetched server-side without validation.
- SQL injection: parameterised queries only.
- Rate limiting on auth and all public writes; lockout and abuse signals (PLT-009).
- Prompt-injection defence: ingested and uploaded content is data, never instructions; AI pipelines receive it inside delimited, non-instruction contexts; enrichment outputs are treated as untrusted and reviewed (RES-026).
- Webhooks (payments, e-sign): signature verification mandatory before any state change (LS-022, DOC-052).

## 5. Privacy posture (DPDP Act and related)

- Roles: Turn2Law as data fiduciary/processor as applicable; subprocessor list maintained (AI providers, payments, email, hosting) and reviewed before onboarding (founder decision D3).
- Notice and consent captured at signup and material interactions; consent records queryable.
- Data principal rights workflows: access, correction, erasure, grievance, mapped to real deletion capabilities.
- Purpose limitation: confidential legal material is never used to train shared models without lawful basis and authorisation.
- Data residency and subprocessor terms: founder decision; architecture keeps AI/provider boundaries switchable until decided.
- No compliance claims beyond implemented and reviewed controls; commencement-dependent obligations tracked with their effective dates.

## 6. Audit (PLT-019, ADM-110)

Append-only audit_log for: authentication events, permission and role changes, publication and source config changes, matter transitions, document approvals, payment and refund administration, break-glass access, data exports. Audit writes are in the same transaction as the action where possible; the table is INSERT-only at the policy level.

## 7. Security testing

- Dependency scanning in CI; SAST on API code.
- Automated tests: authorization matrix tests (every scope vs representative routes), tenant isolation tests (cross-org access attempts), webhook signature tests, sanitisation tests.
- Pre-launch: external security review recommended for payments, auth, and admin surfaces.
