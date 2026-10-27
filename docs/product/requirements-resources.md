# Requirements: Resources (RES)

Status: carried from the Platform PRD v1.0 with repository status. Current page: fully hardcoded content with client-side filtering (verified in audit).

## Public experience

| ID | Requirement | Pri | Repo status |
|---|---|---|---|
| RES-001 | Admin-manageable sections: news, case law, acts, portals, templates, guides, compliance calendars, events, learning, glossary, startup resources, tools, featured, recent, trending/saved | P0 | MARKETING (hardcoded sections) |
| RES-002 | Search, filters, sorting, featured collections, related, saved items, pagination or efficient load, suggestions, empty/loading/error states, SEO URLs | P0 | MARKETING (client-side filter over JS array) |
| RES-003 | Card metadata: title, type, source, publication date, last-verified date, description, tags, destination, review status; no fabricated popularity or timestamps | P0 | NONE (current cards include unverifiable dates) |
| RES-004 | Detail pages: content or excerpt, source link, publisher, dates, last-checked, jurisdiction, related items, downloads, save/share, author/reviewer for editorial, revision history; official vs editorial vs AI clearly distinguished | P0 | NONE |

## Editorial CMS

| ID | Requirement | Pri | Repo status |
|---|---|---|---|
| RES-010 | Workflow: Draft, In Review, Approved, Scheduled/Published, Updated/Archived | P0 | NONE |
| RES-011 | Structured editor (headings, lists, links, images, tables, attachments), PDF/DOCX upload, metadata, tags, source attribution, scheduling, SEO, featured placement, related items, authors/reviewers, preview, unpublish/archive/restore, revision rollback, audit, real metrics | P0 | NONE |
| RES-012 | Separation of duties: no self-approval where review required; configurable publishing permissions | P0 | NONE |

## Source registry and ingestion

| ID | Requirement | Pri | Repo status |
|---|---|---|---|
| RES-020 | Source registry with full config: name, URL, type, authority, category, connector config, jurisdiction, topics, reliability tier, refresh interval, permitted method, licensing notes, attribution, fetch state, health, reviewer | P0 | NONE |
| RES-021 | Source types: RSS/Atom, official APIs, open-data feeds, court databases, notifications, sitemap where permitted, connectors, manual editorial; most reliable legal method per source; no invented endpoints | P0 | NONE |
| RES-022 | Candidate discovery checklist (SC, HCs, eCourts, India Code, MCA, ministries, CBIC, CBDT, SEBI, RBI, MeitY, IP India, Startup India, labour, licensed publishers); verify each before enabling | P1 | NONE |
| RES-023 | Async pipeline: schedule, fetch, validate identity, store raw metadata, normalize, dedupe, extract dates, classify, extract entities, preserve attribution, quality checks, publish gate, index, surface errors | P0 | NONE |
| RES-024 | Publication policies: auto-publish only trusted metadata-only; summaries and uncertain items to review; never silently replace editor content; preserve versions; reindex without duplication; detect upstream deletions/corrections; fetched is not verified | P0 | NONE |
| RES-025 | Scheduling and resilience: retries with backoff, rate limits, conditional requests, timeouts, failure notifications, dead-letter, manual sync, pause/resume, health, freshness, idempotent, robots and licensing respected; public page never scrapes on request | P0 | NONE |
| RES-026 | AI enrichment traceable to source and model/prompt version; untrusted content sanitised; instructions in external content never override system rules | P1 | NONE |

## Index, monitoring, provenance

| ID | Requirement | Pri | Repo status |
|---|---|---|---|
| RES-030 | Searchable schema with ranking, filters, dedupe, incremental indexing, fallback if search down | P0 | NONE |
| RES-031 | Admin monitoring: counts, freshness, failures, duplicates, pending approvals, search analytics (incl. zero-result), alerts | P1 | NONE |
| RES-032 | Provenance: source URL/id, retrieval timestamp, publication date, content hash, version, attribution, review history; no full copyrighted content without permission | P0 | NONE |

## Notes

- Sequenced early (Phase 3) per PRD section 9: delivers continuous value and exercises admin + jobs + foundation.
- Zero licensed feeds verified today (D2); pipeline ships with the manual_editorial DEV connector until then.
- Current hardcoded page content (news items, dates, events) is unverifiable and must not seed production as-is (D4).
- Acceptance: acceptance-test-plan.md section E.
