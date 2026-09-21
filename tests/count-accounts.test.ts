import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  ACTIVITY_LABELS,
  SEED_USER_IDS,
  collectCounts,
  errorClass,
  main,
} from "../scripts/count-accounts.mjs";

const FIELDS = [
  "product",
  "users",
  "organizations",
  "paying",
  "installs",
  "as_of",
  "source",
  "activity",
  "activity_labels",
];
const NOW = () => new Date("2026-09-20T10:11:12.345Z");
const SINCE = new Date("2026-08-21T10:11:12.345Z"); // 30 days before NOW
const RECENT = new Date("2026-09-10T00:00:00Z");
const OLD = new Date("2026-01-01T00:00:00Z");
const SEED = SEED_USER_IDS[0];

// Strings that exist only inside mocked rows. None may reach the output.
const ROW_STRINGS = [
  "Row Person",
  "row.person@rows.example",
  "rows.example",
  "acct_rowsecret123",
  "sk-row-secret-key",
  "Row Contract.pdf",
  "Row Skill Title",
  "row free text notes",
];

type Row = Record<string, unknown>;
type Tables = Record<string, Row[]>;

const person = { name: "Row Person", email: "row.person@rows.example" };
const doc = (userId: string, status: string, createdAt: Date): Row => ({
  userId,
  status,
  createdAt,
  fileName: "Row Contract.pdf",
});
const draft = (userId: string, status: string, createdAt: Date, exportedAt: Date | null = null): Row => ({
  status,
  createdAt,
  exportedAt,
  displayName: "Row Skill Title",
  analysis: { document: { userId } },
});
const review = (clientId: string, status: string, createdAt: Date): Row => ({
  clientId,
  status,
  createdAt,
  clientNotes: "row free text notes",
});

const TABLES: Tables = {
  user: [
    { id: SEED, ...person, stripe: "acct_rowsecret123" },
    { id: "u1", ...person, encryptedApiKey: "sk-row-secret-key" },
    { id: "u2", ...person },
  ],
  document: [
    doc(SEED, "COMPLETED", RECENT),
    doc("u1", "COMPLETED", RECENT),
    doc("u1", "COMPLETED", OLD),
    doc("u2", "FAILED", RECENT),
    doc("u2", "UPLOADED", OLD),
  ],
  skillDraft: [
    draft(SEED, "EXPORTED", RECENT, RECENT),
    draft("u1", "EXPORTED", OLD, RECENT),
    draft("u1", "EXPORTED", OLD, OLD),
    draft("u2", "REVIEW", RECENT),
    draft("u2", "GENERATING", RECENT),
    draft("u2", "FAILED", RECENT),
  ],
  reviewRequest: [
    review(SEED, "COMPLETED", RECENT),
    review("u1", "COMPLETED", RECENT),
    review("u2", "COMPLETED", OLD),
    review("u2", "PENDING", RECENT),
  ],
};

const EXPECTED_ACTIVITY = {
  documents_uploaded_total: 4,
  documents_uploaded_30d: 2,
  documents_analyzed_total: 2,
  documents_analyzed_30d: 1,
  skills_drafted_total: 3,
  skills_drafted_30d: 1,
  skills_published_total: 2,
  skills_published_30d: 1,
  reviews_completed_total: 2,
  reviews_completed_30d: 1,
};

const EMPTY: Tables = { user: [], document: [], skillDraft: [], reviewRequest: [] };

/** Evaluates the subset of Prisma `where` the script uses: equality, in, notIn, gte, relations. */
function matches(row: unknown, where: Row): boolean {
  if (row === null || typeof row !== "object") return false;
  return Object.entries(where).every(([key, cond]) => {
    const value = (row as Row)[key];
    if (cond === null || typeof cond !== "object" || cond instanceof Date) return value === cond;
    const c = cond as Row;
    if ("notIn" in c) return !(c.notIn as unknown[]).includes(value);
    if ("in" in c) return (c.in as unknown[]).includes(value);
    if ("gte" in c) return value instanceof Date && value >= (c.gte as Date);
    return matches(value, c);
  });
}

/**
 * A database client that holds rows but answers only `count()`.
 * Any other method, or any argument besides `where`, throws, so a non-COUNT read fails the test.
 */
function mockClient(tables: Tables = TABLES) {
  const calls: string[] = [];
  const wheres: Row[] = [];
  const model = (name: string) =>
    new Proxy(
      {},
      {
        get(_t, method) {
          const call = `${name}.${String(method)}`;
          if (method !== "count" || !(name in tables)) throw new Error(`forbidden call: ${call}`);
          return async (args?: { where?: Row }) => {
            calls.push(call);
            if (name === "user") {
              assert.equal(args, undefined, "user count must take no filter");
              return tables[name].length;
            }
            assert.deepEqual(Object.keys(args ?? {}), ["where"], "count takes a where filter and nothing else");
            wheres.push(args!.where!);
            return tables[name].filter((row) => matches(row, args!.where!)).length;
          };
        },
      },
    );
  const client = new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === "$disconnect") return async () => void calls.push("$disconnect");
        if (prop === "then") return undefined;
        return model(String(prop));
      },
    },
  );
  return { client, calls, wheres };
}

async function run(argv: string[], createClient: () => Promise<unknown>) {
  let out = "";
  let err = "";
  const code = await main(argv, {
    createClient,
    now: NOW,
    stdout: (s) => (out += s),
    stderr: (s) => (err += s),
  });
  return { code, out, err };
}

test("prints one JSON object with exactly the nine fields", async () => {
  const { client, calls } = mockClient();
  const { code, out, err } = await run([], async () => client);

  assert.equal(code, 0);
  assert.equal(err, "");
  const parsed = JSON.parse(out);
  assert.deepEqual(Object.keys(parsed), FIELDS);
  assert.equal(parsed.product, "CLAUSEMASTER");
  assert.equal(parsed.users, 3);
  assert.equal(parsed.as_of, "2026-09-20T10:11:12Z");
  assert.equal(typeof parsed.source, "string");
  assert.equal(calls[0], "user.count");
  assert.equal(calls.at(-1), "$disconnect");
  assert.ok(calls.every((c) => c === "$disconnect" || c.endsWith(".count")));
});

test("null means not applicable, zero means a measured zero", async () => {
  const counts = await collectCounts(mockClient(EMPTY).client, NOW);

  assert.strictEqual(counts.users, 0);
  assert.strictEqual(counts.paying, 0);
  assert.strictEqual(counts.organizations, null);
  assert.strictEqual(counts.installs, null);
  for (const [key, value] of Object.entries(counts.activity)) {
    assert.strictEqual(value, 0, `${key} is a measured zero on an empty database`);
  }
  assert.match(counts.source, /no billing/);
  assert.match(counts.source, /no tenant table/);
  assert.match(counts.source, /read-only/);
});

test("activity holds 4 to 10 snake_case figures, each an integer or null", async () => {
  const { activity } = await collectCounts(mockClient().client, NOW);
  const keys = Object.keys(activity);

  assert.ok(keys.length >= 4 && keys.length <= 10, `${keys.length} activity keys`);
  for (const key of keys) {
    assert.match(key, /^[a-z][a-z0-9]*(_[a-z0-9]+)*_(total|30d)$/);
    const value = (activity as Record<string, unknown>)[key];
    assert.ok(value === null || Number.isInteger(value), `${key} is an integer or null`);
  }
  assert.ok(!("active_users_30d" in activity), "the schema has no last-seen to count active users from");
});

test("every activity key has a plain label of at most five words", async () => {
  const { activity, activity_labels } = await collectCounts(mockClient().client, NOW);

  assert.deepEqual(Object.keys(activity_labels), Object.keys(activity));
  assert.deepEqual(activity_labels, { ...ACTIVITY_LABELS });
  for (const [key, label] of Object.entries(activity_labels)) {
    assert.equal(typeof label, "string");
    const words = (label as string).split(/\s+/).filter(Boolean);
    assert.ok(words.length >= 1 && words.length <= 5, `${key}: "${label}"`);
    assert.equal(key.endsWith("_30d"), (label as string).endsWith(", 30 days"), `${key}: "${label}"`);
  }
});

test("activity counts outcomes, windows by date and leaves out seed records", async () => {
  const { activity } = await collectCounts(mockClient().client, NOW);
  assert.deepEqual(activity, EXPECTED_ACTIVITY);

  const seedOnly: Tables = {
    user: TABLES.user.filter((r) => r.id === SEED),
    document: TABLES.document.filter((r) => r.userId === SEED),
    skillDraft: [TABLES.skillDraft[0]],
    reviewRequest: TABLES.reviewRequest.filter((r) => r.clientId === SEED),
  };
  const seeded = await collectCounts(mockClient(seedOnly).client, NOW);
  assert.ok(Object.values(seeded.activity).every((v) => v === 0));
  assert.match(seeded.source, /Excluded from activity/);
  assert.match(seeded.source, /test accounts .* cannot be told apart/);
});

test("filters hold only seed ids, status values and the 30-day date", async () => {
  const { client, wheres } = mockClient();
  await collectCounts(client, NOW);

  const allowed = new Set([...SEED_USER_IDS, "COMPLETED", "REVIEW", "SUBMITTED", "APPROVED", "REJECTED", "EXPORTED"]);
  const walk = (value: unknown): void => {
    if (value instanceof Date) return assert.equal(value.getTime(), SINCE.getTime());
    if (typeof value === "string") return assert.ok(allowed.has(value), `unexpected filter string "${value}"`);
    if (Array.isArray(value)) return value.forEach(walk);
    assert.ok(value !== null && typeof value === "object", "unexpected filter value");
    Object.values(value as Row).forEach(walk);
  };
  assert.equal(wheres.length, Object.keys(ACTIVITY_LABELS).length);
  wheres.forEach(walk);
});

test("the seed record never counts as paying, even with a payout account", async () => {
  assert.deepEqual([...SEED_USER_IDS], ["demo-publisher"]);
  const seedOnly = { ...EMPTY, user: TABLES.user.filter((r) => r.id === SEED) };
  const counts = await collectCounts(mockClient(seedOnly).client, NOW);

  assert.strictEqual(counts.users, 1); // users is every account row
  assert.strictEqual(counts.paying, 0);
});

test("no string from a row reaches the output", async () => {
  const { client } = mockClient();
  const { out, err } = await run([], async () => client);

  for (const s of [...ROW_STRINGS, ...SEED_USER_IDS]) {
    assert.ok(!out.includes(s), `output leaked "${s}"`);
    assert.ok(!err.includes(s), `stderr leaked "${s}"`);
  }
});

test("--out=DIR writes DIR/clausemaster.json with the same object", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "count-accounts-"));
  try {
    const { code, out } = await run([`--out=${dir}`], async () => mockClient().client);
    assert.equal(code, 0);
    assert.equal(await readFile(path.join(dir, "clausemaster.json"), "utf8"), out);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("a connection error prints the error class only", async () => {
  class PrismaClientInitializationError extends Error {}
  const secret = "postgresql://owner:hunter2@db.rows.example:5432/prod";
  const { code, out, err } = await run([], async () => {
    throw new PrismaClientInitializationError(`Can't reach database server at ${secret}`);
  });

  assert.equal(code, 1);
  assert.equal(out, "");
  assert.deepEqual(JSON.parse(err), { error: "PrismaClientInitializationError" });
  assert.ok(!err.includes("rows.example") && !err.includes("hunter2"));
});

test("an odd error class or a bad count never leaks text", async () => {
  assert.equal(errorClass("postgresql://x"), "UnknownError");
  assert.equal(errorClass(null), "UnknownError");
  assert.equal(errorClass(Object.create(null)), "UnknownError");
  const Weird = { "db.rows.example": class extends Error {} }["db.rows.example"];
  assert.equal(errorClass(new Weird()), "UnknownError");

  const leak = async () => "row.person@rows.example" as unknown as number;
  const zero = async () => 0;
  const badUsers = { user: { count: leak } };
  const badActivity = {
    user: { count: zero },
    document: { count: zero },
    skillDraft: { count: leak },
    reviewRequest: { count: zero },
  };
  for (const bad of [badUsers, badActivity]) {
    const { code, out, err } = await run([], async () => bad);
    assert.equal(code, 1);
    assert.equal(out, "");
    assert.deepEqual(JSON.parse(err), { error: "TypeError" });
  }
});

test("without a connection string in the environment it fails closed", async () => {
  const saved = { c: process.env.COUNT_DATABASE_URL, d: process.env.DATABASE_URL };
  delete process.env.COUNT_DATABASE_URL;
  delete process.env.DATABASE_URL;
  try {
    let out = "";
    let err = "";
    const code = await main([], { stdout: (s) => (out += s), stderr: (s) => (err += s) });
    assert.equal(code, 1);
    assert.equal(out, "");
    assert.deepEqual(JSON.parse(err), { error: "MissingDatabaseUrl" });
  } finally {
    if (saved.c !== undefined) process.env.COUNT_DATABASE_URL = saved.c;
    if (saved.d !== undefined) process.env.DATABASE_URL = saved.d;
  }
});
