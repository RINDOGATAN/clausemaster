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
