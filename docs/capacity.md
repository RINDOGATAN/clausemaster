# Capacity

What one hosted instance of Clausemaster can carry, derived from the code and the hosting
tier it runs on today, and what changes when a ceiling is reached. Numbers come with their
reasoning. "Unknown, to measure" means nobody has measured it yet; treat it as a task, not a
guess.

## Hosting tier today

| Component | Tier | Limits that matter here |
|---|---|---|
| Web and API | Vercel serverless, Hobby plan | One request per invocation; the code is designed around a 10 s function limit (`CLAUDE.md`, "Client-Driven Pipelines"); 4.5 MB request body limit on serverless functions; invocation and bandwidth quotas per month (check the current plan page for exact figures) |
| Database | Neon Postgres, free tier, via the Vercel integration | About 0.5 GB storage per project; a monthly compute-hours allowance; compute suspends when idle and resumes on the next query (a cold query pays the resume latency) |
| Email | Resend, free tier | About 100 emails per day and 3,000 per month |
| Community AI tier | One OpenAI-compatible endpoint configured by `PLATFORM_AI_*` | The provider's own per-key requests-per-minute and tokens-per-minute limits |
| Skill publishing | GitHub Git Data API with a fine-grained token | 5,000 API requests per hour per token; one publish is a handful of requests |

## Per-instance ceiling

| Dimension | Ceiling | Reasoning |
|---|---|---|
| Organisations | Not modelled | Tenancy is per user (`User` owns `Document`, `SkillDraft` hangs off `Analysis`). There is no organisation table, so nothing to cap and nothing to share. |
| Users | About 100 new sign-ins per day by magic link; Google sign-in unbounded | Every magic link is one email; the email tier allows about 100 per day, shared with review notifications. A user row is under 1 KB; the users table is not a limit. |
| Documents stored | Roughly 100 to 400 in total | Each upload is stored as bytes in `Document.fileData` (up to the 10 MB code cap, but 4.5 MB in practice, see below) plus `Analysis.rawExtractedText` and the draft JSON. At 1 MB average that is about 400 documents inside 0.5 GB; at the 4.5 MB maximum about 100. Storage is the first hard wall. |
| Largest upload | 4.5 MB | The route accepts 10 MB, but the platform rejects serverless request bodies above 4.5 MB before the route runs, so the user sees a platform error rather than the route's message. |
| Longest single AI step | 10 s | Each pipeline step is one invocation. The option-generation step on a large contract (about 40 clauses) has been observed near 2 minutes and will time out (`OPEN-ISSUES.md` item 2). |
| Invocations per document | About 150 end to end | 1 upload, 4 analysis steps, 3 draft steps, plus status polling every 2 s (`POLL_INTERVAL` in `UploadProgress.tsx`) for the 1 to 3 minutes a run takes. |
| Sign-in attempts | 10 per 15 minutes per IP, per warm instance | `RATE_LIMITS.auth` in `src/lib/rate-limit.ts`. Counters live in process memory, so a new instance starts at zero. |
| Invite-code checks | 10 per 15 minutes per IP, per warm instance | `RATE_LIMITS.invite`. |
| Uploads | 20 per 10 minutes per user, per warm instance | `RATE_LIMITS.upload`. |
| AI requests per minute | Unknown, to measure | Bounded by the configured community provider's limits, which differ per provider and key, and by each user's own key on the paid tier. |
| Database connections | Unknown, to confirm | Each warm instance holds its own Prisma pool. On a direct (unpooled) connection string the small free-tier connection limit is reached after a few dozen warm instances; on the pooled endpoint it is not a concern. Confirm which string the integration set. |
| Concurrent pipelines | Unknown, to measure | Each browser drives its own document; nothing serialises across users. The practical bound is the AI provider's rate limit, not the platform. |

## What breaks first, in order

1. **Large PDFs**: uploads between 4.5 MB and 10 MB fail at the platform with a payload
   error, not in the route. Fix: lower `MAX_FILE_SIZE` to match, or move uploads to
   direct-to-storage.
2. **Option generation on long contracts**: exceeds the 10 s step limit. Fix: persist one
   clause batch per step (`OPEN-ISSUES.md` item 2).
3. **Database storage**: 0.5 GB fills after roughly 100 to 400 documents because files and
   extracted text live in Postgres.
4. **Magic-link email**: about 100 sign-ins per day.
5. **Rate-limit counters**: per instance and lost on cold start. Adequate against one
   client on one warm instance, not a global quota.
6. **Reference skill context**: `knowledge/loader.ts` reads `LEGALSKILLS_DIR` from local
   disk. On the hosted instance that directory does not exist, the loader returns nothing,
   and analysis runs without the reference clauses. This degrades quality silently rather
   than failing.

## Hosted scaling plan

Each row is what replaces the current arrangement when its ceiling is hit.

| Concern | Today | Replacement |
|---|---|---|
| Database tier | Neon free tier, compute suspends when idle | Next Neon tier: more storage, autoscaling compute, point-in-time restore. No code change. |
| Connection pooling | Prisma pool per instance | Use the pooled connection string and set `connection_limit=1` in `DATABASE_URL` for serverless, so instances do not multiply connections. No code change. |
| File storage | `Document.fileData` bytes column | Object storage (a blob store or an S3-compatible bucket) with only a key in the row, plus direct-to-storage uploads to escape the 4.5 MB body limit. Drop `rawExtractedText` after analysis or compress it. Code change in the upload route, `parser.ts` and the document router. |
| Rate-limit state | In-memory `Map` per instance | A small Postgres table keyed by (scope, key, window) updated with an atomic upsert, or a hosted KV store. The limiter already has a single `check()` entry point, so the store can be swapped without touching the routes. |
| Reference skills | Sibling directory on disk | Read the published skills repository through the GitHub API with a short in-memory cache, or bundle a snapshot at build time. |
| Long AI steps | One invocation per step, batches inside one step | One batch per invocation, as the analysis pipeline already does. |
| Polling load | 2 s status polls per running document | Longer interval after the first minute, or return the next step's status from the step mutation itself so the poll is only a fallback. |
| Email | Free email tier | Paid tier on the same provider or a transactional SMTP relay; the code path is one function in `auth.ts` and one in `notifications.ts`. |
| Function duration | 10 s design limit | Keep the client-driven step design; it is what makes every other row optional. |

## Measuring

- Storage: `SELECT pg_size_pretty(pg_total_relation_size('clausemaster.documents'));` and the
  same for `analyses`.
- Function time per step: `Analysis.processingTimeMs` and `SkillDraft.processingTimeMs`
  already record it; the e2e compat spec records per-stage wall clock.
- AI provider limits: the provider's response headers on a 429 during a busy run.
