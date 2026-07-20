# Clausemaster

Clausemaster turns legal documents into installable AI skills. Upload a contract or a compliance questionnaire, review what the analysis found, and publish a skill that runs in the [TODO.LAW](https://todo.law) suite and in any LegalQuants-community runtime.

Built by TODO.LAW. Skills you author are yours: open format, no lock-in, no revenue cut.

## What it does

1. **Analyzes your document.** A three-step AI pipeline classifies the document (type, jurisdiction, parties), extracts every clause with a plain-language summary and bias assessment, and flags issues: missing clauses, unusual terms, jurisdiction concerns, compliance risks.
2. **Generates a skill draft.** For contracts, it builds a clause library where each clause carries 3 to 5 negotiation options with pros, cons, and full legal text. For compliance documents (DPIAs, vendor audits, checklists), it builds a structured assessment template with scoring guidance. Every draft also gets evaluation cases grounded in its own content, so quality can be checked before anyone relies on it.
3. **Publishes a dual-format skill.** One export produces both formats:
   - the todo.law engine files (`clauses.json`, `boilerplate.json` or `template.json`, `manifest.json`), installable as a signed package in Dealroom, DPO Central, or AI Sentinel
   - an agent skill (`SKILL.md` with YAML frontmatter, `README.md`, `parameters.json`, `evals/`), loadable by LQ.AI and other LegalQuants-community runtimes

A conformance check runs before every publish, so a malformed skill fails at export time with a clear message instead of failing at install time.

## Compatibility

| Target | Status | Notes |
|--------|--------|-------|
| Dealroom (todo.law) | Yes | Signed `.skill` package, installer-verified |
| DPO Central (todo.law) | Yes | Assessment templates with type routing |
| AI Sentinel (todo.law) | Planned | Installer in development |
| LQ.AI / LegalQuants runtimes | Yes | Loads as a standard skill folder |
| Claude and other agent-skill hosts | Yes | `SKILL.md` follows the agent-skills convention (top-level `name` and `description`); extra JSON files are ignored by hosts that do not use them |

The skill format is an open specification. Anyone can implement it, and skills are separate works from any host that loads them.

## How it compares to conversational skill builders

Anthropic's skill-creator (and the builders based on it, including those used by legal skill hubs) authors a skill through conversation: you describe your workflow, answer questions one at a time, and the agent writes the skill from what you articulate. That works well when the knowledge lives in your head and nowhere else.

Clausemaster starts from the other end: the knowledge is already in your documents. A clause library refined over fifty deals cannot be dictated in a chat session, but it can be uploaded. The two approaches are complementary.

- Use Clausemaster when you have precedent documents, templates, or completed questionnaires. You get structured clause options, an assessment engine, and dual-format output in minutes.
- Use a conversational builder when you are capturing judgment and process rather than documents: escalation rules, negotiation discipline, review workflows.
- Combine them: generate the skill from your document here, then refine the `SKILL.md` prose conversationally in any agent that supports skills.

## Getting the most out of it

- **Feed it your best precedent, not a blank template.** The clause options and bias analysis are only as good as the source document.
- **Review the draft before publishing.** Every draft stops in a review state where you can edit clauses, boilerplate, and metadata.
- **Check the generated evals.** They cite the skill's own clauses and criteria with verifiable assertions, but they are AI-drafted. Have a lawyer confirm any legal claims before relying on them.
- **Pick the right AI tier.** The free community tier uses a platform-provided open model. Bring your own API key (Anthropic, OpenAI, Groq, Mistral, or Together) for stronger models; your key is encrypted and your documents go to your provider, not ours.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16, TypeScript, React 19 |
| API | tRPC 11 with superjson |
| Database | PostgreSQL via Prisma |
| Auth | NextAuth 4 (magic link + Google OAuth) |
| AI | Vercel AI SDK (`@ai-sdk/anthropic`, `@ai-sdk/openai-compatible`) |
| Styling | Tailwind CSS 4, shadcn/ui |
| i18n | next-intl (EN/ES) |
| File parsing | pdf-parse, mammoth |

## Getting started

Prerequisites: Node.js 20+, a PostgreSQL database, and an AI provider key.

```bash
git clone https://github.com/RINDOGATAN/clausemaster.git
cd clausemaster
npm install
cp .env.example .env   # fill in DATABASE_URL, NEXTAUTH_SECRET, and an AI key
npx prisma db push
npm run dev            # http://localhost:3002
```

All AI pipelines run as client-driven steps: the browser calls a "run one step" endpoint in a loop until the server reports done. Steps are idempotent, so an interrupted pipeline resumes when the page reloads, and every AI call fits in a single short serverless invocation.

Useful checks:

```bash
npx tsc --noEmit                                  # typecheck
node scripts/check-skill-conformance.mjs <dir>    # validate an exported skill
curl localhost:3002/api/health                    # DB-touching health check
```

## Project structure

```
src/
  app/                  # Next.js app router
    (auth)/             # Sign-in, verify-request, auth-error
    (dashboard)/        # Documents, upload, analysis, skill drafts
    api/                # NextAuth, tRPC, upload, health
  components/           # Analysis, documents, upload, landing, shadcn/ui
  server/
    routers/            # tRPC routers (document, analysis, skill-draft)
    services/
      ai/               # Provider factory, analyzer, generators, schemas
      document/         # PDF/DOCX/TXT text extraction
      knowledge/        # Reference skill loader
      export/           # Skill exporter and conformance validation
  messages/             # i18n strings (en.json, es.json)
scripts/
  check-skill-conformance.mjs   # Static validator for exported skills
```

## Deployment

Runs on Vercel at `clausemaster.todo.law`. The filesystem is read-only there, so uploads are stored as bytes in the database, and publishing commits skill files to a Git repository through the GitHub API.

## License

[AGPL-3.0-or-later](https://www.gnu.org/licenses/agpl-3.0.html). Skills you export are licensed separately, under the license you choose.
