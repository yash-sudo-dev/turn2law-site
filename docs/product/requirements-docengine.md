# Requirements: Doc Engine (DOC)

Status: carried from the Platform PRD v1.0 with repository status. Critical audit note: the live nine-step wizard described by the PRD (Select, Method, Form, Brand, Review, Generate, Preview, Sign, Download, with XeLaTeX rendering and PKCS#12 signing) runs on the production codebase and is NOT in this repository (Blocker B1). The preserve-and-extend rule can only be honoured after B1 is resolved.

## Catalogue

| ID | Requirement | Pri | Repo status |
|---|---|---|---|
| DOC-001 | Configurable template catalogue (NDA, founders, employment, consultancy, vendor, MOU, IP assignment, privacy, terms, SHA, SSA, term sheet, ESOP, rental, loan, notice, approved additions) | P0 | MARKETING (static template list in page) |
| DOC-002 | Template metadata: category, users, jurisdiction, inputs, dependencies, versions, approval status, reviewer, limitations, formats | P0 | NONE |
| DOC-003 | Only approved templates generatable in production unless reviewer enables draft | P0 | NONE |

## Generation workflow

| ID | Requirement | Pri | Repo status |
|---|---|---|---|
| DOC-010 | Select type or describe requirement | P0 | Production wizard only (not in repo) |
| DOC-011 | Understand: purpose, parties, jurisdiction, context, requested terms | P0 | Production only |
| DOC-012 | Clarify: targeted follow-ups, plain-language explanations | P0 | NONE |
| DOC-013 | Confirm: structured instruction summary, corrections before generate | P0 | NONE |
| DOC-014 | Generate from approved versioned clause library; no invented statutory wording; mandatory clauses validated | P0 | NONE |
| DOC-015 | Validate: missing fields, date inconsistencies, party details, cross-references, contradictions, required sections | P0 | NONE |
| DOC-016 | Review: editable draft, clause explanations, risk flags | P0 | NONE |
| DOC-017 | Refine: edit, replace clauses, suggestions, regenerate sections | P1 | NONE |
| DOC-018 | Approve: optional internal or fixed-fee professional review | P1 | NONE |
| DOC-019 | Export: authorised PDF/DOCX; e-signature if configured and appropriate | P0 | Production (PDF/signature) |
| DOC-020 | Preserve: final docs, versions, approvals, audit, execution metadata | P0 | NONE |

## Clause library and controls

| ID | Requirement | Pri | Repo status |
|---|---|---|---|
| DOC-030 | Admin clause library: text, purpose, applicability, variables, dependencies, alternatives, risk categories, references, approval, effective dates, versions, deprecation | P0 | NONE |
| DOC-031 | Generation respects approved combinations; out-of-library provisions flagged and routed to review | P0 | NONE |

## Risk analysis

| ID | Requirement | Pri | Repo status |
|---|---|---|---|
| DOC-040 | Detect: one-sided terms, ambiguity, missing payment terms, broad indemnity, liability, termination, confidentiality, IP, data protection, dispute inconsistencies, missing/contradictory clauses, undefined terms, statutory concerns | P1 | NONE |
| DOC-041 | Flags show clause, category, severity, explanation, verified basis where available, alternative, confidence, human-review need; decision support not conclusions | P1 | NONE |

## Editor, sharing, signature

| ID | Requirement | Pri | Repo status |
|---|---|---|---|
| DOC-050 | Structured editing, autosave with recovery, undo/redo, comments, suggestions, revisions, compare, restore | P1 | NONE |
| DOC-051 | Named collaborators and org sharing; never public by default | P0 | NONE |
| DOC-052 | E-signature via provider: identity, order, notifications, tamper-evident trail, verified callbacks, immutable executed version; distinguish electronic vs legally recognised digital signatures | P1 | Production has PKCS#12 flow (not in repo); provider status unconfirmed |

## Dashboard and admin

| ID | Requirement | Pri | Repo status |
|---|---|---|---|
| DOC-060 | User dashboard: drafts, filters, resume, review requests, versions, downloads, archive/delete | P0 | NONE |
| DOC-061 | Admin: templates, clauses, approvals, publishing, prompt/model versions, limits, quality, failed generations, risk rules, formats, signature settings, usage, retention | P0 | NONE |

## Notes

- B1 decision determines whether Phase 5 adopts the production wizard (preferred) or rebuilds the flow against these requirements.
- The production wizard's XeLaTeX/PKCS#12 capabilities must be preserved either way; they are real, working features.
- Acceptance: acceptance-test-plan.md section C.
