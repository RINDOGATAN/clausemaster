# Schema changes

The database schema lives in `prisma/schema.prisma`. There is no `prisma/migrations`
folder: the schema is applied with `prisma db push` (`npm run db:push`). The production
build runs `prisma generate` only, so a deploy never changes the database by itself. A
schema change is a separate, deliberate step.

## Rules

1. **Forward-only.** There are no down migrations. Undoing a change means writing a new
   forward change, or restoring the database from a backup.
2. **Additive first.** A change that the running code does not know about must not break it.
   Add tables, add nullable columns, add columns with a default, add indexes.
3. **Destructive changes in two deploys (expand, then contract).** To rename or drop a
   column, narrow a type or make a column required: first deploy code that no longer reads
   the old shape (and writes both shapes if a rename), backfill, then remove the old shape
   in a later change.
4. **Never `--accept-data-loss` against production.** `prisma db push` refuses changes that
   would lose data unless that flag is given. If it refuses, the change needs the two-deploy
   path above.
5. **Schema before code.** Apply an additive change to the database before deploying the
   code that uses it; apply a contracting change only after the code that stopped using the
   old shape is live.

## Rehearsing an upgrade

Every schema change is applied to a copy of production before production itself.

1. Create a copy. On Neon, a branch of the production database is a copy-on-write copy:
   `neonctl branches create --project-id <project-id> --parent main --name rehearsal-<yyyymmdd>`
   and `neonctl connection-string rehearsal-<yyyymmdd> --project-id <project-id>`.
   Elsewhere, restore the latest backup into a scratch database.
2. Point a local checkout of the new code at the copy, in a git-ignored
   `.env.production.local` (never `.env.local`), and run `npx prisma db push`. Read the
   printed plan: any warning about data loss stops the rehearsal.
3. Run the new code against the copy (`npm run build && npm start`) and check
   `/api/health`, sign-in, the documents list and one existing skill draft.
4. Apply the same `npx prisma db push` to production, deploy, and check `/api/health`.
5. Delete the copy (`neonctl branches delete rehearsal-<yyyymmdd> --project-id <project-id>`)
   and the local env file.

## Self-hosted installs

Take a backup (`pg_dump`) before pulling a new version of `main`, then follow the
rehearsal above with the restored backup as the copy.

## Possible later change

Moving to `prisma migrate` with a committed migrations folder would give each change a
reviewed SQL file and a recorded history. It needs a baseline migration marked as applied
on the existing production database (`prisma migrate resolve --applied <name>`), which is a
production step and is not done yet.
