# Security

## Reporting a vulnerability

Use GitHub's private vulnerability reporting on this repository (Security tab, "Report a
vulnerability"). Do not open a public issue for anything exploitable. Include the affected
route or file, steps to reproduce, and the impact you believe it has. You will get an
acknowledgement within seven days and a fix or a written decision within thirty.

If private reporting is not enabled on the repository yet, open a public issue titled
"Security contact request" with no details, and the maintainer will provide a private channel.

## Supported versions

Only the `main` branch is supported. The hosted instance runs the latest deployment of
`main`. There are no release tags and no backports.

## Hosted posture

The hosted instance runs on a serverless platform with a managed Postgres database.

- **Authentication**: NextAuth 4 with magic-link email and Google OAuth. Sessions are signed
  JWT cookies. An optional invite code gates the sign-in page when `INVITE_CODE` is set.
- **Sign-in throttling**: magic-link sends, credentials callbacks, OAuth starts and invite
  checks are limited per client IP; uploads are limited per user (`src/lib/rate-limit.ts`).
- **Development providers**: the dev login and the e2e login are compiled out of production
  builds (`src/lib/auth-guards.ts`, verified by `tests/auth-production-build.test.ts`).
- **Data**: uploaded files are stored as bytes in the database, scoped to the owning user.
  tRPC procedures filter by the session's user id; there is no cross-user read path.
- **User AI keys**: encrypted with AES-256-GCM under `API_KEY_ENCRYPTION_SECRET`, decrypted
  only inside the request that calls the provider. Document text is sent to the AI provider
  the user selected. Community-tier users' text goes to the platform-configured provider.
- **Publishing**: a fine-grained GitHub token with Contents: write on one repository. The
  exporter validates every file before committing (`validateExportedFiles`).
- **Secrets**: listed by name in `docs/secrets-inventory.md`. None are committed; `.env*`
  files are git-ignored.
- **Filesystem**: read-only at runtime; nothing is written to disk in API routes.

## Self-hosted posture

The code is AGPL-3.0-or-later and runs anywhere Node 20+ and Postgres are available.

- The operator supplies every secret in `docs/secrets-inventory.md`. Without
  `RESEND_API_KEY`, magic links are printed to the server log: acceptable for local
  development only.
- Without `INVITE_CODE`, sign-up is open to anyone who can receive email.
- The same guards apply: `next build` never includes the dev or e2e providers. Under
  `next dev` the dev login creates or signs in any email without verification, so never
  expose a dev server to a network you do not control.
- Rate limits are in-memory per process. A single long-running Node process enforces them
  globally; a multi-instance deployment does not.

## Known gaps

Stated so they can be planned, not implied.

- Rate limiting is per instance and resets on cold start. There is no shared counter.
- No Content-Security-Policy or other security headers are set beyond framework defaults.
- Sessions use the JWT strategy: signing out on one device does not revoke other devices,
  and a role change reaches an existing session on its next token refresh.
- The invite code is one shared secret for the sign-in gate. The `PublisherInvite` table
  serves publisher onboarding only.
- No audit log of document reads, draft edits or publishes.
- Files and extracted text are stored without application-level encryption; confidentiality
  at rest relies on the database provider.
- Uploaded files are parsed in-process by `pdf-parse` and `mammoth` with no sandbox. The
  10 MB cap and the function time limit bound the damage of a malicious file to one
  invocation.
- No second factor; identity is delegated to the email provider or Google.
- Dependency advisories are checked in CI (`npm audit --audit-level=high`); there is no
  automated dependency update bot.
- No end-to-end test runs in CI (`OPEN-ISSUES.md` item 5).
- Stripe Connect routes remain in the tree but are dormant (`OPEN-ISSUES.md` item 4).
