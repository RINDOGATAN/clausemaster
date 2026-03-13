# Clausemaster

AI-powered contract analysis tool by TODO.LAW.

## Tech Stack

- **Framework**: Next.js 16.1.4, TypeScript, React 19
- **API Layer**: tRPC 11.8.1 with superjson
- **Database**: Prisma 5.22.0 + PostgreSQL (Neon)
- **Auth**: NextAuth 4.24.13 (magic link + Google OAuth)
- **Styling**: Tailwind CSS 4, Shadcn/ui (new-york style), dark brutalist theme with amber/gold accent (#f5a623)
- **AI**: Vercel AI SDK (`ai`, `@ai-sdk/anthropic`, `@ai-sdk/openai-compatible`)
- **i18n**: next-intl (EN/ES)
- **File parsing**: pdf-parse, mammoth (DOCX), react-dropzone

## Project Structure

```
src/
  app/               # Next.js app router pages
    (auth)/          # Sign-in, verify-request, auth-error
    (dashboard)/     # Documents list, upload, analysis results
    api/             # NextAuth, tRPC, file upload endpoints
  components/
    analysis/        # AnalysisSummary, ClauseList, ClauseDetail, IssuePanel, badges
    documents/       # DocumentCard, DocumentGrid, EmptyState
    upload/          # DocumentUploader, UploadProgress, FileTypeIcon
    ui/              # Shadcn components (button, card, dialog, badge, etc.)
  config/brand.ts    # Brand config (amber accent, TODO.LAW)
  server/
    trpc.ts          # tRPC context + procedures
    routers/         # document, analysis routers
    services/
      ai/            # provider.ts, analyzer.ts, prompts.ts, schemas.ts
      document/      # parser.ts (PDF/DOCX/TXT extraction)
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
- `AI_PROVIDER` - `anthropic` | `ollama` | `openai-compatible`
- `AI_MODEL` - Model name (e.g., `claude-sonnet-4-20250514`)
- `ANTHROPIC_API_KEY` - Anthropic API key
- `OLLAMA_BASE_URL` - Ollama server URL
- `LEGALSKILLS_DIR` - Path to legalskills repo (defaults to `../legalskills`)
- `INVITE_CODE` - Optional invite code to gate the sign-in page (unset = open access)

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

When working in this project, do not touch anything in `/Users/sme/NEL/deal-room-todo`.

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

## AI Analysis Pipeline

Three sequential steps using Vercel AI SDK `generateObject`:

1. **Classification**: Detect contract type, jurisdiction, parties, effective date
2. **Clause Extraction**: Break down into individual clauses with summaries
3. **Issue Flagging**: Flag missing clauses, unusual terms, jurisdiction concerns

LegalSkills repo is loaded as read-only reference for Steps 2 and 3.

## Design System

- Dark brutalist theme (always dark, no light mode)
- Accent color: amber/gold `#f5a623`
- Fonts: Jost (body/display), Archivo Black (headings)
- Card style: `.card-brutal` with rounded-2xl, shadow-card
- Port: 3002
