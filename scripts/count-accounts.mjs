#!/usr/bin/env node
/**
 * Read-only account and activity counts for Clausemaster.
 *
 * Reads a production database: do not run without the owner's go-ahead.
 *
 * Usage:
 *   COUNT_DATABASE_URL=<postgres url> node scripts/count-accounts.mjs [--out=DIR]
 *
 * The connection string is taken from COUNT_DATABASE_URL, or DATABASE_URL, in the
 * process environment only. A .env file is never used, so a bare run fails instead
 * of reading whichever database a local file points at.
 *
 * Prints ONE JSON object and nothing else. With --out=DIR it also writes
 * DIR/clausemaster.json. On failure it prints {"error": "<error class>"} to stderr
 * and exits 1. No row value, connection string or error message is ever printed.
 *
 * Read-only by construction: every statement issued is a Prisma `count()`
 * (SELECT COUNT(*)) on users, documents, skill_drafts or review_requests.
 * No row is ever selected.
 *
 * Definitions:
 *   users          every row of the users table, seed and demo rows included.
 *   organizations  null. The schema has no tenant table; accounts are individual.
 *   paying         0. The schema has no subscription or entitlement table, so nobody
 *                  can pay. Stripe Connect fields on publisher profiles are payout
 *                  accounts for revenue share, not paying customers, and are not
 *                  read. If billing is added, count distinct customers with an
 *                  active, unexpired, non-trial entitlement and exclude
 *                  SEED_USER_IDS by id.
 *   installs       null. Nothing reports installs to this product.
 *   new_users_7d, new_users_30d
 *                  the rows counted in users (every row, seed and demo rows
 *                  included, as in users) whose users.createdAt (written in UTC
 *                  by Prisma) falls in the 7 or 30 days up to and including
 *                  as_of. No new_organizations_*: there is no tenant table.
 *   created_at_column  the column the new-account figures are counted by.
 *   activity       integer figures that show real use, keyed `_total` or `_30d`.
 *                  A `_30d` figure counts records created in the 30 days before
 *                  `as_of`, except skills_published_30d, which uses the publish date.
 *                  Records owned by SEED_USER_IDS are excluded from every figure.
 *                  active_users_30d is omitted: sessions are JWT, so the schema holds
 *                  no last-seen, session or audit entry.
 *   activity_labels  the same keys, each with a plain English label.
 *   null means not applicable; 0 means a measured or structural zero.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const PRODUCT = "CLAUSEMASTER";
export const OUT_FILE = "clausemaster.json";

/**
 * Ids written by scripts/seed-demo.ts. Excluded from every `activity` figure, and must
 * be excluded from any future `paying` count.
 */
export const SEED_USER_IDS = Object.freeze(["demo-publisher"]);

export const SOURCE =
  "Clausemaster PostgreSQL database (schema clausemaster), read-only COUNT via scripts/count-accounts.mjs: " +
  "users is every row of the users table, organizations is null because there is no tenant table, " +
  "paying is 0 because there is no billing (no subscription or entitlement table), " +
  "installs is null because nothing reports installs. " +
  "activity counts documents uploaded, documents whose analysis completed, skill drafts that finished " +
  "generating, skills published and review requests completed; a _30d figure counts records created in " +
  "the 30 days before as_of, except skills_published_30d, which uses the publish date. " +
  "Excluded from activity: every record owned by the demo account that scripts/seed-demo.ts creates, matched by id. " +
  "Not excluded: users still counts the demo account, and test accounts of the owner's cannot be told apart " +
  "from real accounts, so their records are counted. " +
  "active_users_30d is omitted because sessions are JWT and the schema holds no last-seen, session or audit entry. " +
  "new_users_7d and new_users_30d count the same rows as users whose createdAt falls in the 7 or 30 days up to and " +
  "including as_of (UTC); there is no organization figure because there is no tenant table.";

/** The column the new-account figures are counted by. */
export const CREATED_AT_COLUMN = Object.freeze({ users: "users.createdAt" });

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The Prisma filter for rows created in the `days` days up to and including `asOf`.
 *
 * @param {Date} asOf
 * @param {number} days
 */
export function createdWithin(asOf, days) {
  return { createdAt: { gte: new Date(asOf.getTime() - days * DAY_MS), lte: asOf } };
}

/** Every `activity` key, mapped to a plain English label of at most five words. */
export const ACTIVITY_LABELS = Object.freeze({
  documents_uploaded_total: "Documents uploaded",
  documents_uploaded_30d: "Documents uploaded, 30 days",
  documents_analyzed_total: "Documents analyzed",
  documents_analyzed_30d: "Documents analyzed, 30 days",
  skills_drafted_total: "Skill drafts generated",
  skills_drafted_30d: "Skill drafts generated, 30 days",
  skills_published_total: "Skills published",
  skills_published_30d: "Skills published, 30 days",
  reviews_completed_total: "Reviews completed",
  reviews_completed_30d: "Reviews completed, 30 days",
});

const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

/** A draft that finished generating: every status except GENERATING and FAILED. */
const DRAFTED_STATUSES = ["REVIEW", "SUBMITTED", "APPROVED", "REJECTED", "EXPORTED"];

function assertCount(n) {
  if (!Number.isInteger(n) || n < 0) {
    throw new TypeError("count is not a non-negative integer");
  }
  return n;
}

/**
 * One `count({ where })` per figure. Filters use ids, enums and dates only.
 *
 * @param {any} client
 * @param {Date} asOf
 */
async function collectActivity(client, asOf) {
  const since = new Date(asOf.getTime() - WINDOW_MS);
  const notSeed = { notIn: [...SEED_USER_IDS] };
  const document = { userId: notSeed };
  const draft = { analysis: { document } };
  const drafted = { ...draft, status: { in: DRAFTED_STATUSES } };
  const review = { clientId: notSeed, status: "COMPLETED" };

  const figures = {
    documents_uploaded_total: ["document", document],
    documents_uploaded_30d: ["document", { ...document, createdAt: { gte: since } }],
    documents_analyzed_total: ["document", { ...document, status: "COMPLETED" }],
    documents_analyzed_30d: ["document", { ...document, status: "COMPLETED", createdAt: { gte: since } }],
    skills_drafted_total: ["skillDraft", drafted],
    skills_drafted_30d: ["skillDraft", { ...drafted, createdAt: { gte: since } }],
    skills_published_total: ["skillDraft", { ...draft, status: "EXPORTED" }],
    skills_published_30d: ["skillDraft", { ...draft, status: "EXPORTED", exportedAt: { gte: since } }],
    reviews_completed_total: ["reviewRequest", review],
    reviews_completed_30d: ["reviewRequest", { ...review, createdAt: { gte: since } }],
  };

  const activity = {};
  for (const [key, [model, where]] of Object.entries(figures)) {
    activity[key] = assertCount(await client[model].count({ where }));
  }
  return activity;
}

/**
 * @param {any} client a Prisma client; only `count()` is ever called on it
 * @param {() => Date} [now]
 */
export async function collectCounts(client, now = () => new Date()) {
  const asOf = now();
  const users = assertCount(await client.user.count());
  // as_of is printed to the second; the new-account windows end at that same instant.
  const asOfSecond = new Date(Math.floor(asOf.getTime() / 1000) * 1000);
  // Same rows as users (no filter), by creation time.
  const newUsers7d = assertCount(await client.user.count({ where: createdWithin(asOfSecond, 7) }));
  const newUsers30d = assertCount(await client.user.count({ where: createdWithin(asOfSecond, 30) }));
  const activity = await collectActivity(client, asOf);
  return {
    product: PRODUCT,
    users,
    organizations: null,
    paying: 0,
    installs: null,
    new_users_7d: newUsers7d,
    new_users_30d: newUsers30d,
    created_at_column: { ...CREATED_AT_COLUMN },
    as_of: asOf.toISOString().replace(/\.\d{3}Z$/, "Z"),
    source: SOURCE,
    activity,
    activity_labels: { ...ACTIVITY_LABELS },
  };
}

/** The class name of an error, and nothing else from it. */
export function errorClass(err) {
  const name =
    err && typeof err === "object" && err.constructor && typeof err.constructor.name === "string"
      ? err.constructor.name
      : "";
  return /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(name) ? name : "UnknownError";
}

class MissingDatabaseUrl extends Error {}

async function createClient() {
  const url = process.env.COUNT_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) throw new MissingDatabaseUrl();
  const { PrismaClient } = (await import("@prisma/client")).default;
  return new PrismaClient({ datasources: { db: { url } }, log: [] });
}

/**
 * @param {string[]} argv
 * @param {{
 *   createClient?: () => Promise<any>,
 *   now?: () => Date,
 *   stdout?: (s: string) => void,
 *   stderr?: (s: string) => void,
 * }} [deps]
 * @returns {Promise<number>} exit code
 */
export async function main(argv, deps = {}) {
  const stdout = deps.stdout ?? ((s) => process.stdout.write(s));
  const stderr = deps.stderr ?? ((s) => process.stderr.write(s));
  const outArg = argv.find((a) => a.startsWith("--out="));
  const outDir = outArg ? outArg.slice("--out=".length) : null;

  let client;
  try {
    client = await (deps.createClient ?? createClient)();
    const counts = await collectCounts(client, deps.now);
    const json = JSON.stringify(counts, null, 2) + "\n";
    if (outDir) {
      await mkdir(outDir, { recursive: true });
      await writeFile(path.join(outDir, OUT_FILE), json);
    }
    stdout(json);
    return 0;
  } catch (err) {
    stderr(JSON.stringify({ error: errorClass(err) }) + "\n");
    return 1;
  } finally {
    try {
      await client?.$disconnect?.();
    } catch {
      // nothing to report: the counts are already printed or the error already classed
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
