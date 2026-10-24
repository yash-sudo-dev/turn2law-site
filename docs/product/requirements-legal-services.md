# Requirements: Legal Services (LS)

Status: carried from the Platform PRD v1.0 (authoritative) with repository status from the Phase 0 audit. Repository status legend: NONE (no code in repo), MARKETING (static page only), PROPOSED (to build).

## Catalogue

| ID | Requirement | Pri | Repo status |
|---|---|---|---|
| LS-001 | Admin-configurable categories: incorporation, registrations, GST, MSME, trademark/IP, ROC, fundraising, ESOP, employment, notices/disputes, contracts, virtual GC, admin-added | P0 | MARKETING (prices on page, hardcoded) |
| LS-002 | Full service record: scope, exclusions, deliverables, docs, process, timelines, fees breakdown, add-ons, questions, jurisdiction, FAQs, owner, terms, versioning, publication status | P0 | NONE |
| LS-003 | All content and prices admin-editable; price changes versioned | P0 | NONE |
| LS-004 | Packages and add-ons with own price, scope, timeline | P1 | NONE |

## Discovery and selection

| ID | Requirement | Pri | Repo status |
|---|---|---|---|
| LS-010 | Category nav, search, filters, sort | P0 | MARKETING (static entity picker exists) |
| LS-011 | Detail pages: inclusions, exclusions, deliverables, process, timelines, transparent price breakdown | P0 | MARKETING (partial, static) |
| LS-012 | Eligibility checks, guided questionnaire in plain language | P0 | NONE |
| LS-013 | Doc-requirement preview, estimates, related, save, enquiry, start-order | P1 | NONE |
| LS-014 | Existing entity picker becomes reusable guided selector | P1 | MARKETING (static picker present) |

## Ordering and checkout

| ID | Requirement | Pri | Repo status |
|---|---|---|---|
| LS-020 | Full order journey: eligibility, info, questionnaire, uploads, price breakdown, terms, pay or quote, matter creation, owner assignment, confirmation | P0 | NONE |
| LS-021 | Fixed price, custom quotes, add-ons, coupons, invoices, refunds, cancellation rules | P0 | NONE |
| LS-022 | Provider payment; paid only after server-side webhook/verify signature check | P0 | NONE (Razorpay unconfirmed: D1/C1) |
| LS-023 | Idempotent orders and payments; duplicate prevention; failed-payment recovery | P0 | NONE |

## Client dashboard and matter tracking

| ID | Requirement | Pri | Repo status |
|---|---|---|---|
| LS-030 | Secure dashboard: orders, status, timeline, owner, outstanding docs, messages, invoices, deliverables, history | P0 | NONE |
| LS-031 | Default reference workflow states | P0 | NONE |
| LS-032 | Workflow states and transitions admin-configurable per service | P0 | NONE |
| LS-033 | Internal vs external authority states visually distinct; never imply government approval | P0 | NONE (marketing shows tracking demo only) |
| LS-034 | Secure document exchange: upload, verify/reject with reason, versioning, signed URLs | P0 | NONE |

## Internal operations

| ID | Requirement | Pri | Repo status |
|---|---|---|---|
| LS-040 | Orders/matters table with search, filters, saved views | P0 | NONE |
| LS-041 | Assignment by role/skill/availability; workload view | P0 | NONE |
| LS-042 | SLA and deadline tracking; delay alerts; escalation | P1 | NONE |
| LS-043 | Tasks, notes, communication history, checklists, transitions, QA, audit trail | P1 | NONE |
| LS-044 | Invoice/payment visibility role-gated (finance only) | P0 | NONE |

## Compliance calendar

| ID | Requirement | Pri | Repo status |
|---|---|---|---|
| LS-050 | Company compliance profiles by entity type and registrations | P0 | NONE |
| LS-051 | Obligations with due dates, recurrence, owner, states | P0 | NONE |
| LS-052 | Email/WhatsApp reminders, acknowledgement, links to services/docs | P1 | NONE |
| LS-053 | Compliance rules store legal source and effective date; controlled admin updates | P0 | NONE |

## Notes

- Non-goals (PRD 3.1): no automated government filing without a human; no approval implications from internal states.
- Dependencies: Phase 1 foundation (orgs, RBAC, storage, notifications, audit) must land first.
- Acceptance: see acceptance-test-plan.md section B.
