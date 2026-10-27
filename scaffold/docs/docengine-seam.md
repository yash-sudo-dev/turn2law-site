# Doc Engine Integration Seam (Decision B1)

The live Doc Engine wizard (nine steps: Select, Method, Form, Brand, Review, Generate, Preview, Sign, Download; XeLaTeX rendering; PKCS#12 signing) runs in the production codebase serving turn2law.in. It is the platform's most valuable working asset. **It is never re-implemented, rebuilt, or shadowed by this scaffold.** Everything here integrates with it at arm's length.

## What exists on this side (all verified by tests)

| Piece | Contract |
|---|---|
| `GET /api/docengine/status` | Reports integration state and the wizard base URL. Unintegrated until an admin links it. |
| `PUT /api/admin/integrations/docengine.wizard` | Admin sets `base_url` (https required). Config only, no code. Scope: `settings.manage`. Audited. |
| `doc_records` table | Org-scoped landing table for documents the wizard produces. RLS isolated. |
| `POST /api/webhooks/docengine` | Signature-verified inbound webhook the wizard calls when a document is generated or executed. Idempotent by `external_id`. |
| `GET /api/docengine/documents` | Lists the caller org's wizard-produced documents. |

## Inbound webhook contract (wizard side implements this)

```
POST /api/webhooks/docengine
Header: x-t2l-signature: HEX(HMAC-SHA256(DOCENGINE_SEAM_SECRET, raw_body))
Body:   {
          "external_id": "<wizard document uuid>",     // idempotency key
          "org_id": "<platform org uuid>",
          "title": "...",
          "template_key": "...",                        // optional
          "status": "external" | "imported" | "executed",
          "external_url": "https://...",                // deep link back into the wizard
          "metadata": { ... }
        }
```

Rules: invalid or missing signature is rejected with 401 and changes nothing; replay of the same `external_id` is a no-op; every accepted document writes an audit event (`docengine.document_received`).

## Auth handoff (to finalise when production access lands)

When a platform user clicks into the wizard, the platform issues a short-lived, single-use signed handoff token containing `{ user_id, org_id, exp }`; the wizard validates it, maps the user to its own session, and calls the webhook with the same identifiers. The token format mirrors the file-link tokens (`exp.signature`) so no new crypto is introduced. This is the only place user identity crosses the seam, and it is one-directional.

## Reconciliation rule

When the production repository lands, this seam is reconciled in favour of the production wizard: routes and tables here adapt to the wizard's real identifiers, and nothing here is ever merged as a competing wizard. Recorded in `docs/product/decisions-log.md` and `build-ahead-reconciliation.md`.
