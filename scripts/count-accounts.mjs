#!/usr/bin/env node
/**
 * Read-only account counts for Clausemaster.
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
 * Read-only by construction: the only statement issued is `user.count()`
 * (SELECT COUNT(*) on clausemaster.users).
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
 *   null means not applicable; 0 means a measured or structural zero.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const PRODUCT = "CLAUSEMASTER";
export const OUT_FILE = "clausemaster.json";

/** Ids written by scripts/seed-demo.ts. Must be excluded from any future `paying` count. */
export const SEED_USER_IDS = Object.freeze(["demo-publisher"]);

export const SOURCE =
  "Clausemaster PostgreSQL database (schema clausemaster), read-only COUNT via scripts/count-accounts.mjs: " +
  "users is every row of the users table, organizations is null because there is no tenant table, " +
  "paying is 0 because there is no billing (no subscription or entitlement table), " +
  "installs is null because nothing reports installs.";

/**
 * @param {{ user: { count: () => Promise<number> } }} client
 * @param {() => Date} [now]
 */
export async function collectCounts(client, now = () => new Date()) {
  const users = await client.user.count();
  if (!Number.isInteger(users) || users < 0) {
    throw new TypeError("count is not a non-negative integer");
  }
  return {
    product: PRODUCT,
    users,
    organizations: null,
    paying: 0,
    installs: null,
    as_of: now().toISOString().replace(/\.\d{3}Z$/, "Z"),
    source: SOURCE,
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
