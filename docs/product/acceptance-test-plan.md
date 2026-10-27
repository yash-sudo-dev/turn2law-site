# Acceptance Test Plan (Proposed)

Status: PROPOSED. Test levels: unit (domain logic, policy gates), integration (API + DB + RLS), end to end (Playwright against staging), security (authorization matrix, isolation, webhook signatures). Fixtures are clearly DEV-labelled and never seed production (PRD rule 3).

## A. Platform journeys

| ID | Journey | Must pass |
|---|---|---|
| A1 | Signup, verify email, login, logout, password reset | Session revoked server-side; reset link single-use |
| A2 | Org create, invite member, accept, switch org | Data of org A invisible to org B (API returns 404) |
| A3 | Session history and revoke | Revoked session fails on next call |
| A4 | Rate limiting | Auth burst throttled; abuse signal recorded |

## B. Legal Services journey (PRD 3.10)

| ID | Steps | Must pass |
|---|---|---|
| B1 | Discover service, read scope/price breakdown, eligibility check | All values from DB; no hardcoded price |
| B2 | Order with questionnaire, idempotency key replay | Duplicate submission creates one order |
| B3 | Pay (test provider), webhook marks paid | Forged or missing signature leaves order unpaid; success URL alone changes nothing |
| B4 | Track matter through configured states | Only allowed transitions accepted; external authority states visually distinct |
| B5 | Client uploads document; reviewer rejects with reason; re-upload versioned | Signed URLs expire; verification status visible |
| B6 | Deliverable published and downloaded | Only org members can download |
| B7 | Admin edits price; version history retained | Old orders keep their pricing snapshot |
| B8 | Compliance obligation appears, reminder queued (email adapter), acknowledged | Recurrence and states correct |

## C. Doc Engine journey (PRD 5.9)

| ID | Steps | Must pass |
|---|---|---|
| C1 | Select approved template, complete questionnaire with targeted follow-ups | Missing required info triggers clarify, not generation |
| C2 | Confirm summary, generate | Assembly from approved clauses only; pipeline version recorded |
| C3 | Validation failures surface in plain language | No generated doc with inconsistent dates or missing mandatory sections |
| C4 | Edit, autosave, refresh mid-edit recovers | New version created; previous version restorable |
| C5 | Risk flags render with explanation and severity | Labelled decision support, never conclusions |
| C6 | Export PDF and DOCX | Formatting preserved; unauthorised user cannot access another org's draft |
| C7 | Draft template is not generatable in production | 403 with clear message (DOC-003) |

## D. Introspector journey (PRD 4.10)

| ID | Steps | Must pass |
|---|---|---|
| D1 | Ask grounded question | Retrieval happens before generation; each substantive claim carries citation |
| D2 | Injected fabricated citation in eval set | Rejected or flagged; never rendered as verified |
| D3 | Question with insufficient sources | Answer states the limitation; no invention |
| D4 | Save session, export brief | Brief marked AI draft requiring professional verification |
| D5 | Case file privacy | Outside org and unassigned internal users get 404 |
| D6 | Provision mapping lookup both directions | No assumed one-to-one; period applicability shown |

## E. Resources journey (PRD 6.6)

| ID | Steps | Must pass |
|---|---|---|
| E1 | Editor drafts, reviewer approves, publisher publishes | Author cannot self-approve (RES-012) |
| E2 | Ingestion run (DEV connector) twice | Second run creates zero duplicates |
| E3 | Forced fetch failure | Retry with backoff, then failing health + admin alert; public page unaffected |
| E4 | Public search with filters | Reads DB/index; zero-result query logged |
| E5 | Malicious script in fetched content | Sanitised at storage and render; nothing executes (XSS test) |
| E6 | Fetched item changes upstream | New version queued for review; editor version never silently replaced |

## F. Admin and security matrix

| ID | Check | Must pass |
|---|---|---|
| F1 | Scope matrix: representative route x every role | Enforcement server-side; matrix test in CI |
| F2 | Audit search | Every prior sensitive action findable; no UPDATE/DELETE path on audit rows |
| F3 | Break-glass access | Reason required; audit row written |
| F4 | Secrets in admin | Write-only; never returned or logged |
| F5 | Job visibility and manual retry | Failed ingestion retryable from admin |
| F6 | No fabricated data anywhere | Production contains only real or explicitly DEV-labelled data; marketing metrics verified or removed (D4) |

## Reporting

Each phase reports: built, functional end to end, implemented but unverified, partial, blocked with reason, test results including failures, security and privacy limitations, and outstanding credentials/env vars. A feature is never reported working because code exists.
