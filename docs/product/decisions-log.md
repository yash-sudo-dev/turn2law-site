# Decisions Log

Recorded by the build agent from founder instructions. Each entry is binding for the build until superseded here.

## 2026-10-25: Phase 0 review decisions

**B1 Repository: production codebase.** Build in the repo that serves turn2law.in, not a fresh build here. The live Doc Engine (nine-step wizard, XeLaTeX, PKCS#12 signing) is the most valuable asset; PRD rule 2 stands: preserve and extend, never rebuild. This static repo is the marketing surface to fold in later. Until production access is granted: Phase 0 docs and repo-agnostic shared-foundation scaffolding only; the wizard is not re-implemented anywhere. *Status: awaiting production repo access; Phase 1 app code blocked.*

**C1 Credentials: dev adapters, staged keys.** Proceed on clearly labelled development adapters. Founder supplies keys per phase, in order: Supabase, then email, then AI provider, then Razorpay; test keys before live. A payment is never marked live without Razorpay keys. Secrets never appear in chat, logs, or committed files; env vars only, documented in `.env.example`.

**D1 Payment provider: Razorpay.** Confirmed by C1 ordering.

**D2 Legal sources: manual editorial only.** Ship the editorial workflow and the manual connector. The source registry and ingestion pipeline are built so licensed feeds plug in later, but default to manual editorial publishing. Nothing unlicensed is scraped or fetched.

**D3 AI provider: no-training default, gated.** Default to a provider whose terms allow no training on our data; all document and case content is gated behind that. Founder confirms the exact provider before any Introspector or Doc Engine content calls go live; until then the adapter runs with that default and is flagged as unconfirmed.

**D4 Content truth: live site wins.** Where metrics or testimonials differ between live and this repo, the repo copy is stale. Remove unverifiable claims (readership numbers, unattributed testimonials) rather than carry them forward. Founder will confirm the real client references and the startups-registered figure. No invented proof.

**D5 GST: suppressed until active.** No GSTIN appears on any document or surface until the founder declares it active.

**Approvals.** Proposed architecture and build order approved as presented (phases 1 to 8 with hard acceptance gates, including the forged-payment-URL test in Phase 4). Reporting required at each gate: built, functional end to end, implemented but unverified, partial, blocked with reasons, test results including failures, security and privacy limitations, outstanding credentials.
