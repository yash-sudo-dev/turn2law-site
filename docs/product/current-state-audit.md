# Current State Audit

Status: VERIFIED (audited 25 Oct 2026 against the repository working tree at commit `6029482` and the live site at turn2law.in). Owner: build agent, for Founder's Office review.

## 1. Headline finding

The repository (`turn2law-site`, GitHub `yash-sudo-dev/turn2law-site`) contains **the static marketing site only**. There is no application backend, no framework, no database, no auth, no API surface, and no build configuration in this repo.

The **live production site runs a different and more advanced codebase** that is not present here. The PRD's instruction to preserve and extend the existing Doc Engine wizard refers to code in that production project, not in this repository. This mismatch is Blocker B1 in `implementation-roadmap.md` and must be resolved by the founder before feature work begins.

Evidence for both claims is below. Everything in this file is verified unless explicitly labelled otherwise.

## 2. Repository ground truth (verified)

### 2.1 Inventory

| Path | Role | Notes |
|---|---|---|
| `index.html` | Marketing homepage | 88 KB, self-contained CSS/JS |
| `legal-services.html` | Marketing page | Prices ₹4,999 to ₹29,999 shown; entity picker; no ordering |
| `docengine.html` | Marketing page | Hero composer mock; templates listed as static content |
| `introspector.html` | Marketing page (dark theme) | No research engine; "Ask Introspector" is a static input |
| `resources.html` | Marketing page | All content hardcoded in the HTML; client-side search over a JS array |
| `login.html`, `signup.html` | Static mock auth pages | Client-side validation only; social buttons show "coming soon" toasts; no backend |
| `ambient.js` | Background dot-grid canvas animation | Included by all 7 pages |
| `turn2law-logo.png` | Logo asset | |
| `README.md` | States: "Static site (HTML/CSS/JS). Deployed on Vercel." | |
| `.gitignore` | `.vercel`, `node_modules`, `.DS_Store`, `.claude` | |

### 2.2 Absent (verified by direct check)

- No `package.json`, lockfile, `tsconfig`, Vite/Next config, `vercel.json`
- No `fetch`, `XMLHttpRequest`, axios, Supabase, Firebase, or `/api/` references anywhere
- No `__NEXT_DATA__` or framework hydration markers
- No environment variables, secrets, jobs, migrations, or server code
- No tests of any kind
- Git history (9 commits) is exclusively marketing-site work

### 2.3 Client-only behaviors that look like products but are not

These are pre-existing and are flagged per the no-fake-integration rule, not accusations:

1. **Contact form (homepage)**: validates client-side, then shows a success message after a timeout. Nothing is sent or stored.
2. **Login/signup forms**: validate client-side; social buttons toast "coming soon". No credentials are checked or created.
3. **Resources search**: filters a hardcoded JS array inside the page.
4. **Doc Engine hero composer**: a static mock.
5. **Marketing metrics and testimonials** ("50+ startups incorporated", named testimonial cards): unverifiable claims baked into HTML. The live site shows different names than this repo, which confirms at least one set is stale. The founder must confirm which figures and testimonials are real; per the PRD, unverifiable ones must not ship on production surfaces.

## 3. Live site comparison (verified 25 Oct 2026, rendered-content probe)

Probed `turn2law.in/` and `turn2law.in/docengine` as an anonymous visitor.

| Signal | Live site | This repo |
|---|---|---|
| `/docengine` | Real 9-step wizard: Select Type, Input Method (manual form, PDF upload, DOCX upload, image OCR), Fill Form, Branding (letterhead 300 DPI specs, header/footer/watermark/signature uploads), Review, Generate, Preview (print/regenerate/download), Sign (PKCS#12 `.pfx`/`.p12` upload with certificate validation), Download | Marketing page only |
| Wizard infrastructure | "Loading templates…", "Loading form schema…", "Classifying document…" loading states; XeLaTeX-class PDF rendering and PKCS#12 signing imply server-side processing | None |
| Homepage testimonials | PK Bennet (Icebrkr), Abhiraj Deshmukr (Sentinellayer), Sarthak Verma (Withera Labs), Pranit Odil (IREC Markets) | Ananya Rao (ICEBRKR), Adv. Pranav Verma, Kabir Menon, Tara Wadhja: different set |
| Theme toggle | "Auto / Light / Dark" control present | Absent |
| `/privacy` route | Linked in footer | Absent (repo footer links `#`) |
| AI assistant | Footer entry point "TURN2LAW AI / Legal Assistant" suggests a widget served by the production app | No widget code |

Not determinable from a rendered probe: the production framework (no script URLs were visible), whether wizard steps require an account, and the production API surface. The PRD notes operating records referencing a Vercel project `turn2law-operations-v2` and a Supabase project; this is consistent with what the probe shows but remains **unverified** until the production repo is audited.

## 4. PRD assumption vs repository reality

| PRD current-state row | PRD verdict | Repository reality |
|---|---|---|
| `/` static marketing | Keep, refine | Matches (this repo is that marketing site) |
| `/legal-services` marketing with prices | Build the workflow | Matches; no ordering code exists |
| `/docengine` live nine-step wizard | Working product; extend | **Not in this repo.** The wizard lives in the production codebase |
| `/introspector` marketing + live input | Build engine | Matches (input is static) |
| `/resources` hardcoded content | Build CMS | Matches |
| `/login`, `/signup` referenced | Confirm auth | Static mocks only; no auth anywhere |
| Chat widget site-wide | Present | Not in this repo |

## 5. Implications for the build

1. The PRD's rule 2 (preserve Doc Engine, never rebuild) **cannot be satisfied from this repository**. Either the production repo is made available to the build, or the founder explicitly decides to build the platform fresh here and accept that the existing wizard is later replaced or migrated.
2. Everything in PRD sections 2 to 7 is greenfield relative to this repo. The marketing pages are the only existing asset to preserve (plus brand tokens: gold `#D8AB5B`, ink `#111111`, gray `#6F6F6F`, line `#EAEAEA`, navy `#0A1628`, Poppins/Inter/DM Mono).
3. The stack proposed in `technical-architecture.md` is a proposal, not an audit finding. Nothing in this repo constrains it except the Vercel deployment of the static site.

## 6. What is verified vs proposed across Phase 0 docs

- Verified: everything in this file.
- Proposed: all architecture, schema, API, ingestion, security, roadmap, and acceptance documents. They are design documents for founder confirmation, clearly labelled as such.
