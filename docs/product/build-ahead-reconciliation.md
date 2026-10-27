# Build-Ahead Reconciliation

Records the explicit tradeoff accepted by the founder on 25 Oct 2026: the platform is being built ahead of production repository access, inside this marketing repository, in portable `/scaffold` form. This file is the checklist for what must be reconciled when production access lands, so the merge is deliberate, not accidental.

## Standing rule (decision B1)

The live Doc Engine wizard is preserved untouched. This scaffold never contains a competing wizard. See `scaffold/docs/docengine-seam.md` for the integration contract. Anything in the scaffold that overlaps a working production feature is reconciled in favour of the production feature, and the scaffold version is retired or reduced to a porting reference.

## What was built ahead (and how portable it is)

| Asset | Portability | Reconciliation action |
|---|---|---|
| SQL migrations (0000 to 9999) | High: plain Postgres/Supabase | Diff against the production Supabase schema; adopt missing tables, drop duplicates, never rename production tables |
| RLS policies + app_user role model | High | Verify production uses equivalent enforcement; keep both layers |
| Server (src/, zero deps beyond PGlite) | Medium: swap the PGlite db layer for the production driver / Supabase client; route logic and guards are framework-free | Wrap as functions or mount under the production stack; keep the guard order (auth, org, scope, validate, audit) |
| Dev adapters (mail, payment, ai, storage) | High by design: provider implementations slot in behind the same interfaces | Razorpay/Resend/AI provider land per decision C1 order; nothing is faked meanwhile |
| SSR pages (src/web.js) | Low by intent: the production React app owns UI | Use as functional reference for the React build; discard after |
| Acceptance gate suite (test/gates.test.js) | High: black-box HTTP tests | Run unchanged against staging; add production fixtures |
| Permission catalog (permissions/scopes.csv) | High | Single source of truth; import as-is |

## Known overlaps to resolve explicitly

1. **Auth**: production may already have users (Supabase Auth). The local auth.users shim is local-only; do not merge user data. Merge account models, not rows.
2. **Payments**: the dev provider and webhook verifier model the Razorpay flow exactly; the real Razorpay adapter replaces the simulator, and the signed-webhook-only rule carries over verbatim.
3. **Resources**: if production already serves a resources page with content, that content is data, not code; it imports through the ingestion staging path with provenance intact.
4. **Introspector**: no production engine exists (audited 25 Oct), so no overlap; retrieval-only mode stands until the AI provider is confirmed (D3).
5. **Marketing pages**: this repo's pages fold into the production app per D4 (live site wins; unverified claims removed).

## Credentials still owed (decision C1 order)

Supabase keys, then email provider, then AI provider (no-training terms, D3), then Razorpay test and live keys. Until each arrives, the matching adapter stays honestly labelled unconfigured and its features degrade rather than fake success.
