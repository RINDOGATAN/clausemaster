import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { SEED_USER_IDS, collectCounts, errorClass, main } from "../scripts/count-accounts.mjs";

const FIELDS = ["product", "users", "organizations", "paying", "installs", "as_of", "source"];
const NOW = () => new Date("2026-09-20T10:11:12.345Z");

// Strings that exist only inside mocked rows. None may reach the output.
const ROW_STRINGS = [
  "Row Person",
  "row.person@rows.example",
  "rows.example",
  "acct_rowsecret123",
  "sk-row-secret-key",
];

const ROWS = [
  { id: SEED_USER_IDS[0], name: "Row Person", email: "row.person@rows.example", stripe: "acct_rowsecret123" },
  { id: "u1", name: "Row Person", email: "row.person@rows.example", encryptedApiKey: "sk-row-secret-key" },
  { id: "u2", name: "Row Person", email: "row.person@rows.example" },
];

/**
 * A database client that holds rows but answers only `user.count()`.
 * Any other model or method throws, so a non-COUNT read fails the test.
 */
function mockClient(rows: unknown[] = ROWS) {
  const calls: string[] = [];
  const model = (name: string) =>
    new Proxy(
      {},
      {
        get(_t, method) {
          const call = `${name}.${String(method)}`;
          if (call !== "user.count") throw new Error(`forbidden call: ${call}`);
          return async (args?: unknown) => {
            assert.equal(args, undefined, "count must take no filter");
            calls.push(call);
            return rows.length;
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
  ) as Parameters<typeof collectCounts>[0];
  return { client, calls };
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

test("prints one JSON object with exactly the seven fields", async () => {
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
  assert.deepEqual(calls, ["user.count", "$disconnect"]);
});

test("null means not applicable, zero means a measured zero", async () => {
  const counts = await collectCounts(mockClient([]).client, NOW);

  assert.strictEqual(counts.users, 0);
  assert.strictEqual(counts.paying, 0);
  assert.strictEqual(counts.organizations, null);
  assert.strictEqual(counts.installs, null);
  assert.match(counts.source, /no billing/);
  assert.match(counts.source, /no tenant table/);
  assert.match(counts.source, /read-only/);
});

test("the seed record never counts as paying, even with a payout account", async () => {
  assert.deepEqual([...SEED_USER_IDS], ["demo-publisher"]);
  const seedOnly = ROWS.filter((r) => SEED_USER_IDS.includes(r.id));
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

  const bad = { user: { count: async () => "row.person@rows.example" as unknown as number } };
  const { code, out, err } = await run([], async () => bad);
  assert.equal(code, 1);
  assert.equal(out, "");
  assert.deepEqual(JSON.parse(err), { error: "TypeError" });
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
