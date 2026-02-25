# Clausemaster

AI-powered contract analysis tool by [TODO.LAW](https://todo.law). Upload a contract and get instant clause-by-clause breakdown, issue flagging, and jurisdiction-specific insights.

## What It Does

Clausemaster runs a three-step AI analysis pipeline on uploaded contracts:

1. **Classification** — Detects contract type, jurisdiction, parties, and effective date
2. **Clause Extraction** — Breaks the contract into individual clauses with summaries, legal significance, and bias assessment
3. **Issue Flagging** — Flags missing clauses, unusual terms, jurisdiction concerns, ambiguities, imbalances, and compliance risks

Each issue is categorized by severity (Info / Warning / Critical) with actionable recommendations.

### Additional Features

- **File support** — PDF, DOCX, and TXT uploads (max 10MB)
- **LegalSkills integration** — Uses reference skill data to improve clause matching and gap detection
- **Skill draft generation** — Generates Deal Room-compatible skill drafts from analyzed contracts
- **Internationalization** — English and Spanish (EN/ES)
- **Auth** — Magic link email and Google OAuth sign-in, with optional invite code gating

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16, TypeScript, React 19 |
| API | tRPC 11 with superjson |
| Database | PostgreSQL (Neon) via Prisma 5 |
| Auth | NextAuth 4 (magic link + Google OAuth) |
| AI | Vercel AI SDK (`@ai-sdk/anthropic`, `@ai-sdk/openai-compatible`) |
| Styling | Tailwind CSS 4, shadcn/ui |
| i18n | next-intl |
| File parsing | pdf-parse, mammoth (DOCX) |

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database (or [Neon](https://neon.tech) account)
- Anthropic API key (or Ollama for local inference)

### Setup

```bash
git clone https://github.com/RINDOGATAN/clausemaster.git
cd clausemaster
npm install
```

Copy `.env.example` to `.env` (or create `.env`) and configure:

```env
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=your-secret
NEXTAUTH_URL=http://localhost:3002

# AI provider: anthropic | ollama | openai-compatible
AI_PROVIDER=anthropic
AI_MODEL=claude-sonnet-4-20250514
ANTHROPIC_API_KEY=sk-ant-...

# Optional
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
RESEND_API_KEY=...
EMAIL_FROM=noreply@yourdomain.com
INVITE_CODE=...
LEGALSKILLS_DIR=../legalskills
```

Push the database schema and start the dev server:

```bash
npx prisma db push
npm run dev
```

The app runs at [http://localhost:3002](http://localhost:3002).

## Project Structure

```
src/
  app/                  # Next.js app router
    (auth)/             # Sign-in, verify-request, auth-error
    (dashboard)/        # Documents list, upload, analysis results
    api/                # NextAuth, tRPC, file upload endpoints
  components/
    analysis/           # AnalysisSummary, ClauseList, ClauseDetail, IssuePanel
    documents/          # DocumentCard, DocumentGrid, EmptyState
    upload/             # DocumentUploader, UploadProgress
    ui/                 # shadcn/ui components
  server/
    services/
      ai/               # AI provider, analyzer, prompts, schemas
      document/          # PDF/DOCX/TXT text extraction
      knowledge/         # LegalSkills repo loader
      export/            # Skill draft exporter
  messages/             # i18n strings (en.json, es.json)
```

## Scripts

```bash
npm run dev          # Start dev server (port 3002)
npm run build        # Production build
npm run lint         # Run ESLint
npx prisma db push   # Push schema to database
npx prisma studio    # Open Prisma Studio
```

## Deployment

Deployed on **Vercel** at `clausemaster.todo.law`. Note that Vercel has a read-only filesystem — file uploads are stored as bytes in the database, not on disk.

## License

[AGPL-3.0-or-later](https://www.gnu.org/licenses/agpl-3.0.html)
