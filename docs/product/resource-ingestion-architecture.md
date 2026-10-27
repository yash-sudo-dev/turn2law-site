# Resource Ingestion Architecture (Proposed)

Status: PROPOSED. Implements RES-020 to RES-026 and the ingestion parts of ADM-070.

## 1. Principles

1. The public Resources page reads from the database and search index only. No visitor request ever triggers a fetch of an external source (PRD rule 8).
2. Every ingested item preserves provenance: source URL, source id, retrieval timestamp, content hash, attribution (RES-032).
3. Ingested content is untrusted input. It is sanitized before storage-as-html and again at render time; embedded instructions are never passed to AI enrichment or executed (prompt-injection defence, PRD 8.5).
4. Licensing gates precede enabling any source. A source with unverified licensing or endpoint status stays disabled with a recorded reason.

## 2. Pipeline stages (RES-023)

    scheduler (pg-boss, per-source interval)
      → connector fetch (conditional GET: ETag/Last-Modified; timeout; per-source rate cap)
      → validate (source identity, schema of feed/API response, size limits)
      → store raw fetch metadata (ingestion_runs.raw_meta, traceability)
      → normalize to resource schema (dates: published / effective / updated)
      → dedupe (content_hash exact; title+source near-dupe via trigram similarity)
      → classify (deterministic rules first; AI assist optional, recorded as enrichment)
      → enrich (optional: summary, tags, entities; traceable to model + prompt version, RES-026)
      → policy gate (auto-publish vs queue for review, per RES-024 policy)
      → index (FTS + optional vector) idempotently
      → monitor (health, freshness, failures surfaced in admin, RES-031)

## 3. Publication policy (RES-024)

- Auto-publish allowed only for: metadata-only entries (title, source, URL, dates) from sources marked trusted, where licensing permits.
- Everything with editorial text, summaries, or uncertain classification queues for human review.
- An editor-approved article is never silently overwritten by fetched content; updates create a new version and re-enter review.
- Deleted or materially changed upstream items are flagged (corrected/removed upstream), not auto-removed.
- Nothing is labelled "verified" because it was fetched; verification is an explicit editorial action.

## 4. Reliability (RES-025)

- Retries with exponential backoff; after N consecutive failures the source is marked failing, alerts fire, and a dead-letter entry is created for admin retry.
- Per-source pause/resume; manual sync button (admin) uses the same code path as the scheduler.
- Idempotency: re-running a job for the same window must not duplicate resources (content_hash + source unique).
- robots.txt and per-source permitted_method are checked before any fetch; connector refuses disallowed methods.

## 5. Source types (RES-021)

Connector interface: `fetch(config) -> NormalizedItem[]`. Implementations: rss_atom, gov_api, court_db_connector, sitemap_discovery (only where permitted), manual_editorial (dev/seed path). New sources = new config rows, not code, unless a new connector type is genuinely needed (RES-014 analogue).

## 6. Candidate source evaluation (RES-022)

A discovery checklist, not a claim of availability. Each candidate below requires manual verification of endpoint, terms, licensing, frequency, and reliability before being enabled, recorded in the source registry with a reviewer:

Supreme Court and official judgment repositories; High Courts; eCourts; India Code; MCA; Ministry of Law and Justice; Ministry of Finance; CBIC; CBDT; SEBI; RBI; MeitY; IP India; Startup India; labour authorities; licensed publishers and reputable news where terms permit.

## 7. Development adapter

Until at least one real feed is licensed and verified, the pipeline runs end to end with the `manual_editorial` connector and clearly DEV-labelled seed content, so the workflow, dedupe, review, indexing, and admin health screens are all exercised without fabricating production data.
