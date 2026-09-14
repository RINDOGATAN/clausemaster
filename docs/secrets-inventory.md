# Secrets inventory

Every environment variable the code reads, where it is expected to live, and what it
unlocks. Names only. Never write a value into this file or anywhere else in the repository.

Locations:

- **Hosted**: the project environment on the hosting platform (production and preview).
- **Local**: a developer's `.env` or `.env.local`, both git-ignored. `.env.example` lists them.
- **CI**: the GitHub Actions workflow. It holds no secrets; install, audit, typecheck and
  unit tests run without any.

"Rotated by" is the repository owner unless stated. "Last rotation" is not tracked anywhere
else, so record the date here whenever a value changes.

## Secrets

| Variable | Lives in | Unlocks | Rotated by | Last rotation |
|---|---|---|---|---|
| `DATABASE_URL` | Hosted (managed by the Neon integration), Local | The whole database: users, uploaded files, analyses, drafts | Neon integration (hosted); owner (local) | Automatic on the hosted side; not recorded |
| `NEXTAUTH_SECRET` | Hosted, Local | Signing of session JWTs. Rotating it signs every user out | Owner | Not recorded |
| `API_KEY_ENCRYPTION_SECRET` | Hosted, Local | AES-256-GCM key for users' stored AI provider keys. There is no re-encryption path: after rotation every user must enter their key again | Owner | Not recorded |
| `ANTHROPIC_API_KEY` | Hosted | Platform Anthropic key used by privileged-domain users (`domain-check.ts`) | Owner, in the provider console | Not recorded |
| `PLATFORM_AI_API_KEY` | Hosted | Community-tier model for every user without their own key | Owner, in the provider console | Not recorded |
| `GOOGLE_CLIENT_SECRET` | Hosted | Google OAuth sign-in (with `GOOGLE_CLIENT_ID`) | Owner, in the Google Cloud console | Not recorded |
| `RESEND_API_KEY` | Hosted | Sending magic-link and notification email. Unset locally: links print to the server log | Owner, in the email provider console | Not recorded |
| `INVITE_CODE` | Hosted (optional) | The sign-in page gate. Unset means open sign-up | Owner | Not recorded |
| `LEGALSKILLS_GITHUB_TOKEN` | Hosted | Fine-grained token with Contents: write on the skills repository; publishing commits with it | Owner, in GitHub developer settings | Not recorded |
| `STRIPE_SECRET_KEY` | Hosted (optional, plumbing dormant, OPEN-ISSUES item 4) | Stripe Connect onboarding routes | Owner, in the Stripe dashboard | Not recorded |
| `DEALROOM_API_KEY` | Hosted (optional) | Expert-directory verification during publisher onboarding | Owner | Not recorded |
| `E2E_CREDENTIALS_SECRET` | Local only | The e2e sign-in provider. Ignored by production builds (`src/lib/auth-guards.ts`), so it must not be set on the hosted side | Owner | Not applicable |

## Configuration values that are not secrets

Read by the code, safe to expose, listed so the cross-check is complete.

| Variable | Lives in | Purpose |
|---|---|---|
| `NEXTAUTH_URL` | Hosted, Local | Canonical origin for auth callbacks and Stripe return links |
| `PLATFORM_AI_BASE_URL`, `PLATFORM_AI_MODEL` | Hosted | Endpoint and model for the community tier |
| `PLATFORM_AI_PROVIDER` | Documented in `.env.example` and `CLAUDE.md` | Not read by any code path today; the community tier is always OpenAI-compatible |
| `GOOGLE_CLIENT_ID` | Hosted | Public half of the Google OAuth pair |
| `EMAIL_FROM` | Hosted, Local | Sender address for email |
| `LEGALSKILLS_GITHUB_OWNER`, `LEGALSKILLS_GITHUB_REPO`, `LEGALSKILLS_GITHUB_BRANCH` | Hosted (optional) | Publish target; defaults in `skill-exporter.ts` |
| `LEGALSKILLS_DIR` | Local | Path to the reference skills checkout read by `knowledge/loader.ts` and used as the publish fallback |
| `DEALROOM_API_URL` | Hosted (optional) | Expert-directory endpoint |
| `SKILL_DEFAULT_LICENSE`, `SKILL_AUTHOR`, `SKILL_ID_NAMESPACE` | Hosted, Local (optional) | Metadata written into exported skills |
| `NODE_ENV` | Set by the build | Gates dev-only providers, logging and the dev sign-in UI |
| `VERCEL_URL`, `PORT` | Set by the platform or shell | Base URL for server-side tRPC calls |
| `BASE_URL`, `TEST_EMAIL`, `EVAL_EMAIL`, `COMPAT_RESULTS_DIR` | Local shell, Playwright only | Target and identities for the e2e specs |

## Cross-check

The tables were built from every `process.env` read in the tree:

```bash
grep -rhoE 'process\.env\.[A-Z0-9_]+' src e2e scripts middleware.ts playwright.config.ts next.config.ts | sort -u
```

`NEXTAUTH_SECRET` and `NEXTAUTH_URL` do not appear in that output because NextAuth reads
them internally; they are listed from its documentation. `DATABASE_URL` is read by Prisma
through `prisma/schema.prisma`. Re-run the command when adding a variable and update the
tables in the same change.
