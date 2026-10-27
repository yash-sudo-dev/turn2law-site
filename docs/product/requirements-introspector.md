# Requirements: Introspector (INT)

Status: carried from the Platform PRD v1.0 with repository status. Key constraint: no licensed or verified legal sources exist yet (Blocker D2), so retrieval-grade features are sequenced after source licensing even where marked P0 by behaviour.

## Research workspace

| ID | Requirement | Pri | Repo status |
|---|---|---|---|
| INT-001 | Natural-language research sessions tied to research matters | P0 | MARKETING (static input only) |
| INT-002 | Saved projects, organisation, history, folders, tags, pinned authorities, annotations | P1 | NONE |
| INT-003 | Follow-ups, refinement, filters, version tracking, exports | P1 | NONE |
| INT-004 | Workspace layout: query, results, sources, filters, matter context; existing input becomes entry | P0 | MARKETING ("Ask Introspector" is static) |

## Research engine

| ID | Requirement | Pri | Repo status |
|---|---|---|---|
| INT-010 | Hybrid retrieval (FTS + vector), dedupe, query expansion, passage extraction, ranking | P0 | NONE |
| INT-011 | Content types: judgments, statutes, sections, rules, regulations, notifications, amendments | P0 | NONE (sources unlicensed: D2) |
| INT-012 | Filters: court, jurisdiction, bench, date, subject | P1 | NONE |
| INT-013 | Provenance, source versioning, freshness, access-controlled search | P0 | NONE |
| INT-014 | Ingestion extensible to new courts/databases; official sources prioritised; no invented endpoints | P0 | NONE (shares Resources pipeline) |

## Grounded responses

| ID | Requirement | Pri | Repo status |
|---|---|---|---|
| INT-020 | Retrieve before generate; per-claim support; unsupported-claim detection | P0 | NONE |
| INT-021 | Citation validation against stored records; refuse fabrication; state limitations | P0 | NONE |
| INT-022 | Full citation metadata: name, court, identifier, date, paragraph, quote, URL, validity, retrieval time | P0 | NONE |
| INT-023 | Binding/persuasive/conflicting distinctions where metadata supports; originals reachable | P1 | NONE |
| INT-024 | Eval tests, failure reporting, visible uncertainty; no hallucination-elimination claims | P0 | NONE |

## Citation intelligence

| ID | Requirement | Pri | Repo status |
|---|---|---|---|
| INT-030 | Citing authorities and treatment where source data permits | P1 | NONE (source-dependent) |
| INT-031 | Flag overruled/reversed/distinguished/superseded with evidence and dates | P1 | NONE (source-dependent) |
| INT-032 | Verified treatment separated from inference; never good-law on LLM conclusion alone | P0 | NONE |
| INT-033 | Citation formatting in Indian styles with links | P2 | NONE |

## Statutory mapping

| ID | Requirement | Pri | Repo status |
|---|---|---|---|
| INT-040 | Versioned IPC/BNS, CrPC/BNSS, Evidence/BSA mapping, both directions | P1 | MARKETING (static chips only) |
| INT-041 | Mapping metadata: titles, text, type, rationale, sources, dates, no-equivalent cases, verification | P1 | NONE |
| INT-042 | No assumed one-to-one; historical vs current vs period-applicable law separated | P0 | NONE |

## Case files and briefs

| ID | Requirement | Pri | Repo status |
|---|---|---|---|
| INT-050 | Case/matter creation with parties, court, numbers, dates | P1 | NONE |
| INT-051 | Uploads, OCR, classification, entities, chronology, evidence organisation | P1 | NONE |
| INT-052 | Research-case linking, notes, collaboration, tasks, versioned summaries, archival | P1 | NONE |
| INT-053 | Generated facts always distinguishable from user-confirmed facts | P0 | NONE |
| INT-060 | Structured brief drafts with standard sections | P1 | NONE |
| INT-061 | Edit, inspect sources, versions, PDF/DOCX export; marked as drafts needing verification | P1 | NONE |

## Notes

- Marketing copy on the current page must not overstate: "a citation on every claim" is the product goal, only true once INT-020/021 ship with real sources (D4 content-truth pass).
- Dependencies: Phase 3 ingestion infrastructure; Phase 1 auth/RBAC for matter privacy.
- Acceptance: acceptance-test-plan.md section D.
