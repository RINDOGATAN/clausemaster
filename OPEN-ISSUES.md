# Open Issues

Engineering backlog. Each item lists context and a suggested first step. Ordered by priority.

## 1. AI Sentinel has no skill installer (suite-side gap)

Clausemaster can author and publish AIS-destined assessment skills (types CONFORMITY /
BIAS_FAIRNESS), but no installer accepts them yet: the DPO Central installer's skillId
pattern does not include an `aisentinel` segment and AIS has no installer of its own. Until
one exists, consider hiding or flagging the AI Sentinel destination in the UI so users do
not publish skills nothing can install.

## 2. Option-generation step vs serverless duration limits (large documents)

The options step batches clauses (8 per AI call) after single-call generation truncated
mid-JSON on a 43-clause document, but all batches still run inside one `skillDraft.runStep`
invocation (about 2 minutes observed for a large contract). On short serverless duration
limits that step will time out. First step: persist per-batch progress (append to
`clausesJson`, one batch per step) so the client-driven loop matches the per-invocation
budget, mirroring the analysis pipeline's design.

## 3. Contract-type taxonomy lacks financing docs ("other" slug collisions)

The classifier's type list (NDA, FOUNDERS, SAFE, ...) has no TERM_SHEET, so a term sheet
lands as `OTHER`, producing skill dir `other` and skillId `com.nel.skills.other`. Every
off-list document collides on the same slug and gets a meaningless skill name in runtimes
that key by folder. First step: add TERM_SHEET and related financing types, and derive the
slug from `contractTypeLabel` when contractType is OTHER.

## 4. Unused Stripe Connect plumbing

The exporter no longer attaches payout identity, but onboarding plumbing remains:
`publisher_profiles.stripeConnect*` columns, router fields, `/publisher-setup` step,
`/api/stripe/connect/*` routes, `STRIPE_SECRET_KEY` env. Remove it in its own PR, or keep
dormant deliberately. Touching auth/onboarding deserves a careful pass either way.

## 5. No automated e2e for the core flow in CI

`e2e/compat-fixture-run.spec.ts` drives upload → analysis → draft → export with stage
metrics, but nothing runs it automatically. First step: wire it (or a trimmed variant
against a mock model) into CI alongside `check-skill-conformance.mjs`.

## 6. Pre-existing lint errors (6)

`npm run lint` reports 6 errors (plus 29 warnings) in files untouched by recent work:
`set-state-in-effect` in settings and both landing pages, and an impure
`useRef(Date.now())` initializer in `UploadProgress.tsx`. Fix mechanically in one small PR.

## 7. UploadProgress step display is coarse

The progress card shows 4 steps but the persisted statuses only cover the first two, so the
card sits on step 2 for most of the run. The step API returns the actual step name
(`extract|classify|clauses|issues`); thread it into the UI. Cosmetic, low priority.

## 8. Assessment skills emit empty parameters.json

`deriveParameters` only scans clause and boilerplate text, so assessments always get
`parameters: []`. Runtime input forms come from frontmatter `inputs:` (emitted top-level),
so nothing breaks, but if assessments should be parameterizable (vendor name, processing
context), derive inputs from template questions. Low priority.

## 9. Docs pages are English-only

The landing page ships EN/ES, but everything under `/docs` is hardcoded English with no
i18n plumbing. Translate the docs section (starting with the end-to-end guide) once its
content settles. Consider the landing page's lightweight local-JSON approach rather than
wiring next-intl into the public pages.

## Resolved

- Skill-specific eval generation shipped as a third draft step (`evals-generator.ts`);
  exporter prefers `evalsJson`, skeleton remains the fallback. Generated evals are
  AI-drafted; the per-skill README instructs legal review before reliance.
- Production env issues from 2026-07 resolved: community-tier model updated, database
  credentials now managed by the Vercel Neon integration, `/api/health` added for
  DB-touching post-deploy smoke checks.
- Structured-output robustness for open models: nullish optional fields, coerced enums,
  explicit `maxTokens`, clause batching.
- Skill exports now include `README.md` and `LICENSE`, `inputs:` at top level, and a
  pre-publish conformance gate (`validateExportedFiles`).
