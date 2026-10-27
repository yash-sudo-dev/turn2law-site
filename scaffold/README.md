# Shared Foundation Scaffold (repo-agnostic)

Status: SCAFFOLD, per founder decision B1 (25 Oct 2026). These artifacts are deliberately independent of any frontend framework so they can drop into the production repository unchanged when access is granted. Nothing here re-implements the Doc Engine wizard or any product UI.

## Contents

| Path | What it is | Phase |
|---|---|---|
| `migrations/0001_shared_foundation.DRAFT.sql` | Postgres/Supabase baseline for PLT identity, orgs, RBAC catalog, sessions, invitations, files, notifications, audit log. **DRAFT: apply only after the production schema audit; adapt names to existing tables.** | 1 |
| `permissions/scopes.csv` | The permission scope catalog (ADM-100) with role assignments used for seeding and for the CI authorization-matrix test. | 1-2 |
| `.env.example` | Environment variable contract for all adapters, per decision C1. Copy to the production repo; never commit real values. | 1+ |

## Rules for using this scaffold

1. Production repository access first: its audit supersedes anything assumed here. If the production Supabase project already has equivalent tables, the draft migration is adapted or discarded in favour of what exists.
2. The migration is written idempotent (`if not exists`, seeds with `on conflict do nothing`) so partial application is safe to retry.
3. Scope names in `scopes.csv` are the single source of truth; API guards, admin UI, and tests all read from this catalog, never ad-hoc strings.
4. Audit log is append-only at the policy level; any tooling that needs "edit" access to audit rows is wrong by definition (PLT-019, ADM-110).

## Verification once applied (Phase 1 gate extract)

- Two orgs cannot read each other's rows (automated test).
- Revoked session fails on next call.
- INSERT-only audit table rejects UPDATE/DELETE.
- Every seeded role resolves to exactly its seeded scopes (no wildcard).
