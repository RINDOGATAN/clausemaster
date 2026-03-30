# Clausemaster

AI-powered contract analysis tool by TODO.LAW.

## Tech Stack

- **Framework**: Next.js 16.1.4, TypeScript, React 19
- **API Layer**: tRPC 11.8.1 with superjson
- **Database**: Prisma 5.22.0 + PostgreSQL (Neon)
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
    api/             # NextAuth, tRPC, file upload endpoints
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
      ai/            # provider.ts, analyzer.ts, skill-generator.ts, assessment-generator.ts
      document/      # parser.ts (PDF/DOCX/TXT extraction)
      export/        # skill-exporter.ts (writes to legalskills/)
      knowledge/     # loader.ts (reads legalskills repo)
  lib/               # auth.ts, prisma.ts, trpc.ts, utils.ts
  i18n/              # config.ts, request.ts
  messages/          # en.json, es.json
```

## Key Commands

```bash
npm run dev          # Start dev server on port 3002
npm run build        # Build for production
npx prisma db push   # Push schema to database
npx prisma studio    # Open Prisma Studio
```

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - NextAuth session secret
- `ANTHROPIC_API_KEY` - Platform Anthropic key (for privileged-domain users)
- `PLATFORM_AI_PROVIDER` - Community tier provider (e.g., `groq`)
- `PLATFORM_AI_MODEL` - Community tier model (e.g., `qwen/qwen3-32b`)
- `PLATFORM_AI_API_KEY` - Community tier API key
- `PLATFORM_AI_BASE_URL` - Community tier base URL
- `LEGALSKILLS_DIR` - Path to legalskills repo (defaults to `../legalskills`)
- `INVITE_CODE` - Optional invite code to gate the sign-in page (unset = open access)
- `E2E_CREDENTIALS_SECRET` - Optional secret enabling e2e-credentials auth provider for Playwright tests

## Relationship with Dealroom

Clausemaster is a **standalone** project that connects to Dealroom (`deal-room-todo`) in one direction:

- **Clausemaster reads** the private `RINDOGATAN/legalskills` repo as reference context during analysis (knowledge/loader.ts)
- **Clausemaster writes** skill drafts that can be exported to `legalskills/` for Dealroom to consume
- **Clausemaster NEVER modifies** `deal-room-todo` files, database, or configuration
- Both share the same Neon PostgreSQL cluster but use **separate schemas** (`clausemaster` vs Dealroom's default)
- Auth cookie domain is `.todo.law` (shared SSO across `clausemaster.todo.law` and `dealroom.todo.law`)

### LegalSkills Integration
- **Repo**: `RINDOGATAN/legalskills` (private, premium skills with `manifest.json`)
- **Local path**: `../legalskills` (override via `LEGALSKILLS_DIR` env var)
- **INPUT**: `loader.ts` reads metadata/clauses and handles both flat strings and i18n objects
- **OUTPUT**: `skill-generator.ts` outputs Dealroom's i18n format:
  - `pros: { partyA: { en: [...] } }` / `cons: { partyA: { en: [...] } }` (nested, not flat `prosPartyA`)
  - `bias: { partyA: 0.4 }` (nested, not flat `biasPartyA`)
  - `category: { en: "Term" }` (i18n object, not flat string)
  - `metadata.json` includes `languages`, `jurisdictions`, `soloModeSupported`
  - `boilerplate.json` wraps all text fields in i18n objects

When working in this project, do not touch anything in the deal-room-todo repository.

## Deployment

- **Host**: Vercel (serverless) — currently on **Hobby plan**
- **Domain**: clausemaster.todo.law
- **Important**: Vercel has a **read-only filesystem** — never write files to disk in API routes. File uploads are stored as `Bytes` in the database (Document.fileData column).
- Skill draft export (`skill-exporter.ts`) writes to `legalskills/` directory — this only works locally, not on Vercel.

## Known Blocker: Analysis timeout on Vercel Hobby (Feb 2026)

The AI analysis pipeline (3 sequential calls: classify → extract clauses → flag issues) exceeds the **10-second function timeout** on Vercel Hobby. The upload route uses `after()` + `maxDuration=120` which are already in place, but Hobby caps at 10s regardless.

**To unblock — upgrade to Vercel Pro**, then:
1. Upload + analysis should work as-is (`after()` keeps the function alive, `maxDuration=120` is respected on Pro)
2. Test by uploading `manual-samples/Series A Term Sheet.pdf`
3. Verify: document status progresses UPLOADED → EXTRACTING → ANALYZING → COMPLETED

**Alternative if Pro is not an option**: split the 3 AI steps into separate API routes, each called sequentially by the client (each fits within 10s). This would require refactoring the analyzer and the client polling logic.

## AI Provider Architecture

Two-tier system stored per-user in the `User` model (`aiProvider`, `aiModel`, `encryptedApiKey`):

- **Community tier (default)**: Platform-provided open-weights model (currently Qwen 3 32B via Groq). No API key needed from the user. Configured via `PLATFORM_AI_*` env vars.
- **Pro tier**: User brings their own key for Anthropic, OpenAI, Groq, Mistral, or Together. Key is encrypted with AES-256-GCM.

Provider registry: `src/server/services/ai/providers.ts` — metadata for each provider (labels, key prefixes, default models, base URLs).
Config resolver: `src/server/services/resolve-ai-config.ts` — resolves per-user `AIConfig` (provider + model + key + baseUrl).
Model factory: `src/server/services/ai/provider.ts` — `getAIModel(config)` creates the correct Vercel AI SDK model instance.

Privileged-domain users (e.g., `@privacycloud.com`) always use the platform Anthropic key regardless of their settings.

## AI Analysis Pipeline

Three sequential steps using Vercel AI SDK `generateObject`:

1. **Classification**: Detect contract type, jurisdiction, parties, document category (contract/assessment), party mode (two-party/solo), suggested destination
2. **Clause Extraction**: Break down into individual clauses with summaries
3. **Issue Flagging**: Flag missing clauses, unusual terms, jurisdiction concerns

LegalSkills repo is loaded as read-only reference for Steps 2 and 3.

## Skill Types & Destinations

- **SkillType**: `CONTRACT` (two-party or solo) | `ASSESSMENT` (compliance checklists)
- **PartyMode**: `TWO_PARTY` (negotiated) | `SOLO` (unilateral policies)
- **SkillDestination**: `DEAL_ROOM` | `DPO_CENTRAL` | `AI_SENTINEL`
- Contract skills → Deal Room; privacy assessments → DPO Central; AI governance → AI Sentinel

## Landing Page

- V2 is the default at `/`; V1 accessible via `/?v=1`
- Components in `src/components/landing/v2/` with shared header/footer in `landing/`
- EN/ES i18n via local JSON files (not next-intl — standalone client-side locale detection)
- Auth card embedded in hero: magic link + Google OAuth via NextAuth
- CSS scroll-reveal animations via IntersectionObserver (no framer-motion)
- Hero video: compressed with ffmpeg (CRF 30, 720p, no audio, ~1.4MB)

## Brand Assets

- **Logo**: `/public/logo-negative.svg` — full wordmark (TODO.LAW) for headers/navbars
- **Symbol**: `/public/simbol-negative.svg` — isometric icon for favicons/compact use
- **Favicon**: `/public/favicon.ico` (legacy) + `/public/favicon.svg` (modern) + `/public/favicon.png` (fallback)
- **Apple Touch Icon**: `/public/apple-touch-icon.png` — iOS home screen
- **PWA Icons**: `/public/icon-192.png` + `/public/icon-512.png` — referenced in `site.webmanifest`
- Logo is displayed via `<img>` tag alongside a `<span>CLAUSEMASTER</span>` in Jost 600 / text-primary
- All layouts (auth, dashboard, public, landing) use the same logo pattern

## E2E Testing

- **Framework**: Playwright (`playwright.config.ts`, `e2e/` directory)
- **Auth**: Uses `e2e-credentials` provider gated by `E2E_CREDENTIALS_SECRET` env var
- **Dev login**: Sign-in page has a `dev-credentials` provider (development mode only, no secret needed)
- Test specs: `e2e/demo-invite-code.spec.ts`, `e2e/demo-publisher-onboarding.spec.ts`, `e2e/demo-negative-expert.spec.ts`

## Design System

- Dark brutalist theme (always dark, no light mode)
- Accent color: amber/gold `#f5a623`
- Fonts: Jost (body/display), Archivo Black (headings)
- Card style: `.card-brutal` / `.paper-card` with rounded-2xl, shadow-card
- `.container` must be defined in globals.css (`mx-auto w-full max-width: 1400px`) — Tailwind v4 does not provide this by default
- Port: 3002
