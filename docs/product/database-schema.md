# Database Schema (Proposed)

Status: PROPOSED. Postgres (Supabase). All domain tables carry `org_id` (tenant scope, PLT-012) with RLS policies; append-only tables reject UPDATE/DELETE. `id` columns are uuid (default gen_random_uuid) unless noted. Timestamps are `timestamptz` with `created_at` / `updated_at`. This is the Phase 0 entity design; migrations will be written per phase, not all at once.

## 1. Identity, orgs, RBAC (PLT-001 to PLT-013)

- **profiles**: id (FK auth.users), name, phone, avatar_url, notification_prefs jsonb, language, status (active, suspended, deletion_requested), created_at.
- **organizations**: id, name, slug, type (client, firm, internal), created_by, created_at.
- **org_members**: org_id, user_id, role (enum), member_status, invited_by, invited_at, joined_at. PK (org_id, user_id).
- **roles / role_scopes**: roles seeded as PRD 2.2 list; role_scopes maps role to permission scopes (ADM-100 list). Per-matter overrides in matter_assignments.
- **sessions**: id, user_id, token_hash, device_label, ip_hash, user_agent, created_at, last_seen_at, revoked_at. (Supabase auth plus this table for device history, PLT-007.)
- **invitations**: id, org_id, email, role, token_hash, expires_at, accepted_at.

## 2. Shared services (PLT-014 to PLT-020)

- **files**: id, org_id, uploader_id, bucket, path, filename, mime, size, sha256, scan_status, created_at. Downloads via short-lived signed URLs only.
- **notifications**: id, org_id, user_id, channel (inapp, email, whatsapp), template_key, payload jsonb, status (queued, sent, failed, skipped), attempts, last_error, sent_at.
- **notification_preferences**: user_id, channel, topic, opted_in.
- **audit_log** (append-only): id, org_id, actor_id, actor_role, action, entity_type, entity_id, before jsonb, after jsonb, ip_hash, created_at. INSERT only.
- **consents**: id, user_id, org_id, kind, granted, evidence, created_at.
- **saved_items**: id, user_id, org_id, item_type (service, document, research, resource), item_id, created_at.
- **feature_flags**: key, enabled, rollout jsonb.

## 3. Legal Services (PRD 3.8)

- **service_categories**: id, name, slug, sort, active.
- **services**: id, category_id, name, slug, description, seo jsonb, target_customer, eligibility jsonb, scope, exclusions, deliverables jsonb, required_documents jsonb, process_steps jsonb, timeline, jurisdiction, professional_fee, government_fee, tax_rate, terms, cancellation_refund_policy, owner_id, lead_time_days, publication_status (draft, published, retired), version, created_at, updated_at.
- **service_versions** (append-only): service_id, version, snapshot jsonb, editor_id, change_note, created_at.
- **service_packages**: id, service_id, name, price, scope, timeline, active.
- **service_addons**: id, service_id, name, price, scope.
- **service_questionnaires**: id, service_id, version, schema jsonb (conditional questions), active.
- **orders**: id, org_id, user_id, service_id, package_id, addon_ids jsonb, questionnaire_responses jsonb, pricing_snapshot jsonb, idempotency_key unique, status (draft, awaiting_payment, paid, quote_requested, in_progress, completed, cancelled, refunded), quote_id, created_at.
- **matters**: id, order_id, org_id, reference (T2L-YYYY-NNNN), service_id, workflow_state, owner_id, assigned_professional_id, priority, sla_due_at, opened_at, closed_at.
- **matter_workflow_states** (admin-configurable, LS-032): id, service_id, state_key, label, kind (internal, external_authority), order_idx, required_actions jsonb, completion_condition, allowed_transitions jsonb.
- **matter_status_events** (append-only): matter_id, from_state, to_state, actor_id, note, created_at.
- **matter_tasks**: id, matter_id, title, assignee_id, due_at, state, checklist jsonb.
- **matter_documents**: id, matter_id, file_id, kind (client_upload, internal, deliverable), verification_status (pending, verified, rejected), rejection_reason, version, uploaded_by, reviewed_by.
- **matter_messages**: id, matter_id, sender_id, visibility (client, internal), body, created_at.
- **quotations**: id, order_id, items jsonb, total, valid_until, state, created_by.
- **invoices**: id, order_id, number, amount, tax, total, issued_at, pdf_file_id.
- **payments**: id, order_id, provider, provider_ref, amount, status (created, authorized, captured, failed, refunded), verified_at, verified_by (webhook signature check, LS-022).
- **refunds**: id, payment_id, amount, reason, requested_by, approved_by, status.
- **coupons**: code, kind, value, max_uses, used, expires_at, active.
- **compliance_profiles**: id, org_id, entity_type, pan, tan, cin, financial_year_start, registrations jsonb.
- **compliance_rules**: id, obligation_key, title, legal_source, effective_from, recurrence, defaults jsonb, version, active (LS-053).
- **compliance_obligations**: id, org_id, rule_id, due_date, status (upcoming, due, overdue, completed), owner_id, ack_at, completed_at, linked_matter_id.

## 4. Introspector (PRD 4.9)

- **research_matters**: id, org_id, title, created_by, tags jsonb.
- **research_sessions**: id, research_matter_id, user_id, title, created_at.
- **research_queries** (append-only): id, session_id, question, retrieval_params jsonb, answer_md, confidence, limitation_note, created_at.
- **legal_sources**: id, name, url, kind (judgments, statute, regulation, notification), authority, reliability_tier, licensing_notes, enabled.
- **legal_documents**: id, source_id, external_ref, doc_type, title, court, jurisdiction, bench, dated, citation_ids jsonb, content text, content_hash, provenance jsonb, ingested_at, last_verified_at.
- **legal_document_versions** (append-only): document_id, version, snapshot notes, created_at.
- **retrieved_sources**: id, query_id, legal_document_id, passage, rank, score.
- **citations**: id, query_id, legal_document_id, case_name, citation_id, court, dated, paragraph, quoted_passage, url, validity_status, verified, retrieved_at (INT-022).
- **provision_mappings**: id, old_act, old_section, new_act, new_section, mapping_type, rationale, source_refs jsonb, commencement_date, verification_status (INT-040/041/042).
- **case_files**: id, org_id, title, court, case_number, parties jsonb, dates jsonb, created_by.
- **case_documents**: id, case_file_id, file_id, ocr_status, classification, entities jsonb.
- **case_events**: id, case_file_id, kind, dated, note.
- **research_briefs**: id, research_matter_id, structure jsonb, body_md, version, is_ai_draft (true until professional sign-off, INT-061).
- **eval_runs** (append-only): pipeline_version, dataset, passed, failed, report jsonb, created_at.
- **feedback_reports**: id, user_id, query_id, kind, detail, status.

## 5. Doc Engine (PRD 5.9)

- **doc_templates**: id, category, name, slug, jurisdiction, intended_users, input_schema jsonb, dependencies jsonb, limitations, export_formats jsonb, approval_status (draft, approved, retired), reviewer_id, reviewed_at, version.
- **doc_template_versions** (append-only): template_id, version, snapshot jsonb, editor_id, created_at.
- **clauses**: id, title, purpose, explanation, applicable_types jsonb, jurisdiction, variables jsonb, dependencies jsonb, exclusions jsonb, alternatives jsonb, risk_category, legal_refs jsonb, approval_status, effective_from, version.
- **clause_versions** (append-only): clause_id, version, body, editor_id, reviewer_id, created_at.
- **document_drafts**: id, org_id, created_by, template_id, template_version, state (questionnaire, confirmed, generated, in_review, executed, archived), resumed_at.
- **document_fields**: draft_id, key, value, source (user, ai_suggested, reviewer_edited, INT-053 analogue for docs).
- **document_versions** (append-only): draft_id, version, body_md, generated_by_pipeline_version, created_at.
- **risk_flags**: id, draft_version_id, clause_ref, category, severity, explanation, legal_basis, suggested_alternative, confidence, requires_human (DOC-041).
- **review_requests**: id, draft_id, requested_by, reviewer_id, state, decision, note.
- **signatures**: id, draft_id, provider, provider_ref, signer_name, signer_role, order_idx, status, executed_at.
- **signature_events** (append-only): signature_id, event, payload jsonb, verified (provider callback verified).

## 6. Resources (PRD 6.6)

- **resource_categories**: id, name, slug, sort, active.
- **tags**: id, name, slug.
- **sources**: id, name, url, source_type (rss, api, opendata, court_db, connector, manual), authority, category_id, jurisdiction, topics jsonb, reliability_tier, connector_config jsonb, refresh_interval, permitted_method, licensing_notes, attribution_required, attribution_text, last_success_at, next_run_at, health (healthy, failing, paused), failure_count, enabled, reviewer_id (RES-020).
- **ingestion_jobs**: id, source_id, kind (scheduled, manual), state (queued, running, succeeded, failed, dead), queued_at, started_at, finished_at, error.
- **ingestion_runs** (append-only): job_id, fetched_count, created_count, updated_count, duplicates, rejected, raw_meta jsonb.
- **resources**: id, org_id NULL for public, category_id, kind (article, judgment, act, portal, template, event, guide, glossary), title, slug, summary, body (sanitised), source_id NULL for editorial, source_url, source_published_at, effective_date, last_verified_at, verification_status (unverified, editor_verified), review_status (draft, in_review, approved, scheduled, published, archived), author_id, reviewer_id, seo jsonb, featured, content_hash, version, published_at, created_at, updated_at.
- **resource_versions** (append-only): resource_id, version, snapshot jsonb, editor_id, created_at.
- **resource_tags**: resource_id, tag_id.
- **collections** / **collection_items**: curated lists (RES-001 featured collections).
- **bookmarks**: user_id, resource_id, created_at.
- **search_events**: id, user_id NULL, query, results_count, created_at (RES-031 zero-result tracking).
- **enrichment_jobs**: id, resource_id, kind, model, prompt_version, output jsonb, review_status, processing_ms.

Indexes: org_id on all domain tables; resources (review_status, published_at), (category_id), FTS index on title+summary+body, content_hash unique per source for dedupe.

## 7. RLS posture

- Every domain table: `USING (org_id = auth.jwt()->>'org_id')` or API-layer equivalent enforced in the same transaction.
- Append-only tables: policy INSERT-only.
- Admin tables: scope-gated via server roles, not expose-to-client keys.
- Break-glass access writes audit_log rows (PLT-013).
