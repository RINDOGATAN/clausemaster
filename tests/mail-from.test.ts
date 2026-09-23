import { test } from "node:test";
import assert from "node:assert/strict";
import { mailFrom } from "../src/lib/mail-from";

test("default brand and fallback address", () => {
  assert.equal(mailFrom({}), "Clausemaster by TODO.LAW <noreply@todo.law>");
  assert.equal(mailFrom({ EMAIL_FROM: "" }), "Clausemaster by TODO.LAW <noreply@todo.law>");
});

test("bare address from the variable", () => {
  assert.equal(mailFrom({ EMAIL_FROM: "hello@todo.law" }), "Clausemaster by TODO.LAW <hello@todo.law>");
});

test("display name already in the variable is replaced", () => {
  assert.equal(
    mailFrom({ EMAIL_FROM: "CLAUSEMASTER <noreply@todo.law>" }),
    "Clausemaster by TODO.LAW <noreply@todo.law>"
  );
  assert.equal(
    mailFrom({ EMAIL_FROM: '"noreply todo.law" <noreply@todo.law>' }),
    "Clausemaster by TODO.LAW <noreply@todo.law>"
  );
});
