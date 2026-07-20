# Clausemaster

AI-powered tool that turns legal documents into installable AI skills. By TODO.LAW.

Note: this repository is PUBLIC. Keep this file and all committed docs strictly technical.
No business strategy, pricing, personal data, or infrastructure narratives.

## Tech Stack

- **Framework**: Next.js 16.1.4, TypeScript, React 19
- **API Layer**: tRPC 11.8.1 with superjson
- **Database**: Prisma 5.22.0 + PostgreSQL
- **Auth**: NextAuth 4.24.13 (magic link + Google OAuth)
- **Styling**: Tailwind CSS 4, Shadcn/ui (new-york style), dark brutalist theme with amber/gold accent (#f5a623)
- **AI**: Vercel AI SDK (`ai`, `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/openai-compatible`)
- **i18n**: next-intl (EN/ES)
- **File parsing**: pdf-parse, mammoth (DOCX), react-dropzone

## Project Structure

```
src/
  app/               # Next.js app router pages
    (auth)/          # Sign-in, verify-request, auth-error
    (dashboard)/     # Documents list, upload, analysis, skill-draft, admin
    api/             # NextAuth, tRPC, file upload, health endpoints
  components/
    analysis/        # AnalysisSummary, ClauseList, ClauseDetail, IssuePanel, badges
    documents/       # DocumentCard, DocumentGrid, EmptyState
    landing/         # Landing page (V1 + V2 with i18n)
      v2/            # V2 landing (default at /) with EN/ES i18n
    upload/          # DocumentUploader, UploadProgress, FileTypeIcon
    ui/              # Shadcn components (button, card, dialog, badge, etc.)
  config/brand.ts    # Brand config (amber accent, TODO.LAW)
  server/
    trpc.ts          # tRPC context + procedures
    routers/         # document, analysis, skill-draft, admin routers
    services/
      ai/            # provider.ts, analyzer.ts, skill-generator.ts,
                     # assessment-generator.ts, evals-generator.ts
      document/      # parser.ts (PDF/DOCX/TXT extraction)
      export/        # skill-exporter.ts (dual-format export + validation)
      knowledge/     # loader.ts (reads the reference skills repo)
  lib/               # auth.ts, prisma.ts, trpc.ts, utils.ts
  i18n/              # config.ts, request.ts
  messages/          # en.json, es.json
scripts/
  check-skill-conformance.mjs   # static validator for exported skill folders
```

## Key Commands

```bash
npm run dev          # Start dev server on port 3002
npm run build        # Build for production
npx tsc --noEmit     # Typecheck
npx prisma db push   # Push schema to database
npx prisma studio    # Open Prisma Studio
node scripts/check-skill-conformance.mjs <skill-dir>   # Validate an exported skill
```

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - NextAuth session secret
- `ANTHROPIC_API_KEY` - Platform Anthropic key (privileged-domain users)
- `PLATFORM_AI_PROVIDER` / `PLATFORM_AI_MODEL` / `PLATFORM_AI_API_KEY` / `PLATFORM_AI_BASE_URL` - Community tier provider config
- `LEGALSKILLS_DIR` - Path to the reference skills repo (defaults to `../legalskills`)
- `LEGALSKILLS_GITHUB_TOKEN` - PAT (Contents:write) used to commit published skills. Required in production; when unset, publish writes files into `LEGALSKILLS_DIR` (local dev only).
- `LEGALSKILLS_GITHUB_OWNER` / `LEGALSKILLS_GITHUB_REPO` / `LEGALSKILLS_GITHUB_BRANCH` - Optional overrides for the publish target.
- `INVITE_CODE` - Optional invite code gating the sign-in page (unset = open access)
- `E2E_CREDENTIALS_SECRET` - Optional secret enabling the e2e-credentials auth provider for Playwright tests

## Skills Integration

- **Input**: `knowledge/loader.ts` reads metadata/clauses from the reference skills repo as context for analysis. Handles both flat strings and i18n objects.
- **Output**: the exporter emits dual-format skills. Engine format uses nested i18n objects: `pros: { partyA: { en: [...] } }`, `bias: { partyA: 0.4 }`, `category: { en: "Term" }`; `metadata.json` includes `languages`, `jurisdictions`, `soloModeSupported`; `boilerplate.json` wraps all text fields in i18n objects. Agent format is `SKILL.md` (top-level `name`/`description`, `lq_ai:` block, top-level `inputs:`), `README.md`, `parameters.json`, `evals/evals.json`, `LICENSE`.
- `validateExportedFiles()` in `skill-exporter.ts` gates every publish (required files, skillId patterns, semver, type routing, frontmatter shape).
- Do not modify sibling repositories from this project.

## Deployment

- **Host**: Vercel (serverless), Hobby plan constraints apply
- **Domain**: clausemaster.todo.law
- **Read-only filesystem**: never write files to disk in API routes. Uploads are stored as `Bytes` in the database (`Document.fileData`).
- Publish commits skill files to the configured GitHub repo via the Git Data API when `LEGALSKILLS_GITHUB_TOKEN` is set; otherwise falls back to writing into `LEGALSKILLS_DIR`.
- `DATABASE_URL` in production is managed by the Vercel Neon integration. Do not hand-edit it; rotations sync automatically.
- `/api/health` runs a DB-touching `SELECT 1`. Point post-deploy smoke checks at it.

## Client-Driven Pipelines

All AI pipelines run as **client-driven steps**: the browser calls a "run one step" tRPC
mutation in a loop until the server reports done, so every AI call gets its own serverless
invocation. No server-side fire-and-forget or `after()` anywhere.

- **Analysis**: `document.runAnalysisStep` → extract → classify → clauses → issues →
  COMPLETED. Dispatch derives from persisted state (`analyzer.ts`), so an interrupted
  pipeline resumes when any page with the driver mounts. Zero extracted clauses is treated
  as failure (keeps state derivable).
- **Skill drafts**: `skillDraft.generate`/`regenerate` only create the GENERATING row;
  `skillDraft.runStep` runs options → boilerplate → evals (contract, `skill-generator.ts`)
  or criteria → guidance → evals (assessment, `assessment-generator.ts`). Progress markers
  are which JSON fields are filled. The evals step (`evals-generator.ts`) writes
  `SkillDraft.evalsJson`; on failure the draft still reaches REVIEW and the exporter falls
  back to a skeleton.
- **Client driver**: `src/lib/use-pipeline-driver.ts` (`useAnalysisDriver` /
  `useSkillDraftDriver`), mounted in UploadProgress, documents/[id], and skill-draft pages.
  Steps are idempotent (delete-then-create) so duplicate calls are safe.
- **Never return `Document.fileData` from tRPC**: the Bytes column serializes as a superjson
  `Buffer` typed-array the browser cannot revive. `document.list` and `getById` use explicit
  `select` to exclude it; keep it that way.
- **Structured-output robustness**: generation schemas use `.nullish()` for optional fields,
  free-string enums coerced downstream, explicit `maxTokens`, and clause batching in option
  generation. Open models emit nulls and truncate large JSON; some providers validate
  tool-call schemas server-side and hard-fail otherwise.

## AI Provider Architecture

Two-tier system stored per-user in the `User` model (`aiProvider`, `aiModel`, `encryptedApiKey`):

- **Community tier (default)**: Platform-provided open-weights model. No API key needed from the user. Configured via `PLATFORM_AI_*` env vars.
- **Pro tier**: User brings their own key for Anthropic, OpenAI, Groq, Mistral, or Together. Key is encrypted with AES-256-GCM.

Provider registry: `src/server/services/ai/providers.ts`. Config resolver:
`src/server/services/resolve-ai-config.ts`. Model factory: `src/server/services/ai/provider.ts`.
Privileged-domain users (see `domain-check.ts`) always use the platform Anthropic key.

## AI Analysis Pipeline

Three sequential steps using Vercel AI SDK `generateObject`:

1. **Classification**: Contract type, jurisdiction, parties, document category (contract/assessment), party mode (two-party/solo), suggested destination
2. **Clause Extraction**: Individual clauses with summaries and bias assessment
3. **Issue Flagging**: Missing clauses, unusual terms, jurisdiction concerns

The reference skills repo is loaded as read-only context for steps 2 and 3.

## Skill Types & Destinations

- **SkillType**: `CONTRACT` (two-party or solo) | `ASSESSMENT` (compliance checklists)
- **PartyMode**: `TWO_PARTY` (negotiated) | `SOLO` (unilateral policies)
- **SkillDestination**: `DEAL_ROOM` | `DPO_CENTRAL` | `AI_SENTINEL`
- Contract skills route to Deal Room; privacy assessments to DPO Central; AI governance to AI Sentinel

## Landing Page

- V2 is the default at `/`; V1 accessible via `/?v=1`
- Components in `src/components/landing/v2/` with shared header/footer in `landing/`
- EN/ES i18n via local JSON files (standalone client-side locale detection, not next-intl)
- Auth card embedded in hero: magic link + Google OAuth via NextAuth
- CSS scroll-reveal animations via IntersectionObserver (no framer-motion)
- The auth card reuses the first sentence of `hero.subtitle` (split on the first `.`), so that sentence must stand alone and contain no internal dots

## Brand Assets

- **Logo**: `/public/logo-negative.svg` (wordmark) and `/public/simbol-negative.svg` (icon)
- Favicons and PWA icons in `/public/`; referenced in `site.webmanifest`
- Logo is displayed via `<img>` alongside `<span>CLAUSEMASTER</span>` in Jost 600 / text-primary

## E2E Testing

- **Framework**: Playwright (`playwright.config.ts`, `e2e/` directory)
- **Auth**: `e2e-credentials` provider gated by `E2E_CREDENTIALS_SECRET`; dev-only `dev-credentials` provider on the sign-in page
- `e2e/compat-fixture-run.spec.ts` drives the full pipeline (upload → analysis → draft → export) and records stage metrics

## Design System

- Dark brutalist theme (always dark, no light mode)
- Accent color: amber/gold `#f5a623`
- Fonts: Jost (body/display), Archivo Black (headings)
- Card style: `.card-brutal` / `.paper-card` with rounded-2xl, shadow-card
- `.container` must be defined in globals.css (`mx-auto w-full max-width: 1400px`); Tailwind v4 does not provide it by default
- Port: 3002

## Writing style for user-facing text

Plain and direct. No em-dashes where a period or comma works. No redundant adjectives or
marketing filler. Short sentences over clause chains.
