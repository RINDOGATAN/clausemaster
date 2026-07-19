#!/usr/bin/env node
/**
 * Static conformance checker for exported skill folders.
 *
 * Validates a skill directory (as written by skill-exporter.ts) against the
 * four authorities a dual-format skill must satisfy:
 *
 *   SPEC      — legalskills/SPEC.md (agentskills v0.1): required files,
 *               licence-neutrality, manifest metadata.
 *   LQAI      — lq-ai api/app/skills/schema.py: what the LQ.AI loader
 *               requires (top-level name+description) or warns/skips on
 *               (table mode without columns, malformed inputs entries).
 *   COMMUNITY — lq-skills scripts/check-skill-structure.sh hard floor
 *               (SKILL.md, README.md, LICENSE, evals/evals.json) plus a
 *               stub detector for the exporter's placeholder evals.
 *   TODOLAW   — Dealroom validator.ts / DPO Central assessment-installer
 *               static rules (skillId regexes, semver, clauses/template
 *               structure) as mirrored in todolaw/scripts/test-skill-package.mjs.
 *
 * Usage:
 *   node scripts/check-skill-conformance.mjs <skill-dir> \
 *     [--type contract|assessment] [--expected-fail KG-1,KG-2] [--json <file>]
 *
 * Exit codes: 0 = no errors beyond --expected-fail; 2 = unexpected errors.
 * Warnings never affect the exit code.
 */

import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { join, basename, resolve } from "node:path";

// ── Minimal YAML-subset parser ───────────────────────────────────────────────
// Covers the dialect our exporter emits and the community corpus uses:
// nested mappings by indentation, block sequences ("- item" / "- key: v"),
// flow lists, JSON-quoted or plain scalars. Not a general YAML parser.

function parseScalar(raw) {
  const s = raw.trim();
  if (s === "" || s === "~" || s === "null") return null;
  if (s === "{}") return {};
  if (s === "[]") return [];
  if (s === "true") return true;
  if (s === "false") return false;
  if (s.startsWith("[") && s.endsWith("]")) {
    try {
      return JSON.parse(s);
    } catch {
      return s
        .slice(1, -1)
        .split(",")
        .map((x) => x.trim().replace(/^['"]|['"]$/g, ""))
        .filter((x) => x.length > 0);
    }
  }
  if (s.startsWith('"')) {
    try {
      return JSON.parse(s);
    } catch {
      return s;
    }
  }
  if (s.startsWith("'") && s.endsWith("'")) return s.slice(1, -1);
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  return s;
}

function parseYamlBlock(lines, start, minIndent) {
  // lines: [{indent, text}] with blanks/comments removed
  let i = start;
  const first = lines[i];
  if (!first || first.indent < minIndent) return [null, i];

  if (first.text.startsWith("- ") || first.text === "-") {
    const seq = [];
    const itemIndent = first.indent;
    while (i < lines.length && lines[i].indent === itemIndent && (lines[i].text.startsWith("- ") || lines[i].text === "-")) {
      const rest = lines[i].text.slice(1).trim();
      const kv = rest.match(/^([A-Za-z_][\w-]*):(?:\s+(.*))?$/);
      if (kv) {
        // "- key: value" opens an inline map; following deeper lines extend it
        const virtual = [{ indent: itemIndent + 2, text: rest }];
        let j = i + 1;
        while (j < lines.length && lines[j].indent > itemIndent) {
          virtual.push(lines[j]);
          j++;
        }
        const [val] = parseYamlBlock(virtual, 0, 0);
        seq.push(val);
        i = j;
      } else {
        seq.push(parseScalar(rest));
        i++;
      }
    }
    return [seq, i];
  }

  const map = {};
  const mapIndent = first.indent;
  while (i < lines.length && lines[i].indent === mapIndent) {
    const m = lines[i].text.match(/^([^:\s][^:]*):(?:\s+(.*))?$/);
    if (!m) throw new Error(`unparseable line: "${lines[i].text}"`);
    const key = m[1].trim();
    const rest = (m[2] ?? "").trim();
    if (rest !== "") {
      map[key] = parseScalar(rest);
      i++;
    } else {
      // nested block or empty value
      if (i + 1 < lines.length && lines[i + 1].indent > mapIndent) {
        const [val, next] = parseYamlBlock(lines, i + 1, mapIndent + 1);
        map[key] = val;
        i = next;
      } else {
        map[key] = null;
        i++;
      }
    }
  }
  return [map, i];
}

function parseFrontmatter(md) {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---(\r?\n|$)/);
  if (!m) return { frontmatter: null, body: md, error: "no frontmatter block delimited by ---" };
  const raw = m[1];
  const lines = raw
    .split(/\r?\n/)
    .filter((l) => l.trim() !== "" && !l.trim().startsWith("#"))
    .map((l) => ({ indent: l.length - l.trimStart().length, text: l.trim() }));
  try {
    const [fm] = parseYamlBlock(lines, 0, 0);
    return { frontmatter: fm, body: md.slice(m[0].length), error: null };
  } catch (e) {
    return { frontmatter: null, body: md.slice(m[0].length), error: String(e.message || e) };
  }
}

// ── Check machinery ──────────────────────────────────────────────────────────

const DEALROOM_SKILL_ID = /^com\.(nel|todolaw)\.skills\.[a-z0-9.-]+$/;
const DPOCENTRAL_SKILL_ID = /^com\.(nel|todolaw)\.(dpocentral|skills)\.[a-z0-9.-]+$/;
const SEMVER = /^\d+\.\d+\.\d+$/;

// Fingerprints of skill-exporter.ts buildEvalsSkeleton placeholder content.
const EVAL_STUB_MARKERS = [
  "POSITIVE eval — a realistic user request",
  "CURRENCY eval — a request that would expose stale law",
  "NEGATIVE / gating eval — a request for a combination",
  "Objectively checkable statement 1",
];

const results = [];
function report(id, authority, level, ok, detail, kg = null) {
  results.push({ id, authority, level, ok, detail: ok ? undefined : detail, kg });
}
const check = (id, authority, ok, detail, kg) => report(id, authority, "error", ok, detail, kg);
const warn = (id, authority, ok, detail, kg) => report(id, authority, "warn", ok, detail, kg);

function readJson(dir, file) {
  const p = join(dir, file);
  if (!existsSync(p)) return { exists: false, json: null, error: null };
  try {
    return { exists: true, json: JSON.parse(readFileSync(p, "utf-8")), error: null };
  } catch (e) {
    return { exists: true, json: null, error: String(e.message || e) };
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith("--"));
if (!dir) {
  console.error("usage: check-skill-conformance.mjs <skill-dir> [--type contract|assessment] [--expected-fail KG-1,...] [--json <file>]");
  process.exit(1);
}
const skillDir = resolve(dir);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const expectedFail = new Set((flag("expected-fail") || "").split(",").map((s) => s.trim()).filter(Boolean));

const manifest = readJson(skillDir, "manifest.json");
const template = readJson(skillDir, "template.json");
const skillType =
  flag("type") ||
  (manifest.json?.assessmentType || manifest.json?.skillType === "assessment" || template.exists
    ? "assessment"
    : "contract");
const isAssessment = skillType === "assessment";
const dirName = basename(skillDir);

// ---- SPEC: required files -------------------------------------------------
check("spec.skill-md-exists", "SPEC", existsSync(join(skillDir, "SKILL.md")), "SKILL.md is required");
check("spec.manifest-exists", "SPEC", manifest.exists, "manifest.json is required");
check("spec.manifest-parses", "SPEC", !manifest.exists || manifest.error === null, `manifest.json invalid: ${manifest.error}`);
check("spec.license-exists", "SPEC", existsSync(join(skillDir, "LICENSE")), "LICENSE file is required (licence-neutral: open OR proprietary)", "KG-3");

const man = manifest.json || {};
check("spec.manifest-license-field", "SPEC", typeof man.license === "string" && man.license.length > 0, "manifest license field is authoritative per SPEC");
check("spec.manifest-author", "SPEC", man.author != null, "manifest author missing");
warn(
  "spec.manifest-id-key",
  "SPEC",
  typeof man.id === "string",
  `SPEC manifest uses "id"; this manifest has ${man.skillId ? `"skillId" (todo.law dialect)` : "neither id nor skillId"}`
);
warn("spec.manifest-interface", "SPEC", man.interface != null, 'SPEC manifest declares an "interface" {inputs, outputs} block; absent here');

// ---- LQAI: frontmatter as the loader parses it ----------------------------
let fm = null;
if (existsSync(join(skillDir, "SKILL.md"))) {
  const md = readFileSync(join(skillDir, "SKILL.md"), "utf-8");
  const parsed = parseFrontmatter(md);
  check("lqai.frontmatter-parses", "LQAI", parsed.error === null, `frontmatter parse failed: ${parsed.error}`);
  fm = parsed.frontmatter;
  check("lqai.body-nonempty", "LQAI", parsed.body.trim().length > 0, "SKILL.md body is empty — the agent has no prose to read");

  if (fm) {
    check("lqai.name-required", "LQAI", typeof fm.name === "string" && fm.name.length > 0, "top-level `name` is required (loader skips the skill)");
    check(
      "lqai.description-required",
      "LQAI",
      typeof fm.description === "string" && fm.description.length > 0,
      "top-level `description` is required (loader skips the skill)"
    );
    warn("lqai.name-matches-dir", "LQAI", fm.name === dirName, `frontmatter name "${fm.name}" != folder "${dirName}" (loader keys by folder)`);

    const lq = fm.lq_ai && typeof fm.lq_ai === "object" ? fm.lq_ai : {};
    check(
      "lqai.table-needs-columns",
      "LQAI",
      lq.output_format !== "table" || (Array.isArray(lq.columns) && lq.columns.length > 0),
      "output_format: table requires a non-empty columns list (loader skips the skill)"
    );
    warn("lqai.version-semver", "LQAI", lq.version == null || SEMVER.test(String(lq.version)), `lq_ai.version "${lq.version}" is not semver (surfaced as-is)`);
    if (lq.minimum_inference_tier != null) {
      check(
        "lqai.tier-range",
        "LQAI",
        Number.isInteger(lq.minimum_inference_tier) && lq.minimum_inference_tier >= 1 && lq.minimum_inference_tier <= 5,
        "minimum_inference_tier must be an integer 1-5 (loader skips the skill)"
      );
    }
    // inputs shape — top-level first, then lq_ai.inputs (mirrors extract_inputs)
    const inputs = (fm.inputs && typeof fm.inputs === "object" && fm.inputs) || (lq.inputs && typeof lq.inputs === "object" && lq.inputs) || null;
    if (inputs && !(Object.keys(inputs).length === 0)) {
      for (const bucket of ["required", "optional"]) {
        const entries = inputs[bucket];
        if (entries == null) continue;
        check(`lqai.inputs-${bucket}-is-list`, "LQAI", Array.isArray(entries), `inputs.${bucket} must be a list`);
        for (const [idx, e] of (Array.isArray(entries) ? entries : []).entries()) {
          warn(
            `lqai.inputs-${bucket}-${idx}-shape`,
            "LQAI",
            typeof e === "string" || (e && typeof e === "object" && typeof e.name === "string" && e.name.length > 0),
            `inputs.${bucket}[${idx}] is neither a string nor a {name,...} map — silently dropped by the inputs endpoint`
          );
        }
      }
    }
  }
}

// ---- COMMUNITY: lq-skills hard floor + eval quality -----------------------
check("community.readme", "COMMUNITY", existsSync(join(skillDir, "README.md")), "README.md required by lq-skills CI gate", "KG-1");
check("community.license", "COMMUNITY", existsSync(join(skillDir, "LICENSE")), "LICENSE required by lq-skills CI gate", "KG-3");
const evals = readJson(skillDir, "evals/evals.json");
const evalExempt = existsSync(join(skillDir, "evals/EXEMPT"));
check("community.evals-exist", "COMMUNITY", evals.exists || evalExempt, "evals/evals.json (or evals/EXEMPT) required by lq-skills CI gate");
if (evals.exists) {
  check("community.evals-parse", "COMMUNITY", evals.error === null, `evals.json invalid: ${evals.error}`);
  const ev = evals.json || {};
  check("community.evals-schema", "COMMUNITY", typeof ev.skill_name === "string" && Array.isArray(ev.evals) && ev.evals.length > 0, "evals.json must have skill_name + non-empty evals[]");
  const raw = JSON.stringify(ev);
  const isStub = ev.law_reviewed_as_of === "YYYY-MM-DD" || EVAL_STUB_MARKERS.some((m) => raw.includes(m));
  check("community.evals-not-stub", "COMMUNITY", !isStub, "evals are the exporter's placeholder skeleton, not real evals (would fail human review)", "KG-2");
}

// ---- TODOLAW: installer static rules --------------------------------------
if (manifest.json) {
  const id = String(man.skillId ?? man.id ?? "");
  check(
    "todolaw.skill-id-regex",
    "TODOLAW",
    (isAssessment ? DPOCENTRAL_SKILL_ID : DEALROOM_SKILL_ID).test(id),
    `skillId "${id}" fails the ${isAssessment ? "DPO Central" : "Dealroom"} installer regex`,
    "KG-5"
  );
  warn("todolaw.skill-id-dealroom", "TODOLAW", DEALROOM_SKILL_ID.test(id), `skillId does not match Dealroom's narrower regex (${DEALROOM_SKILL_ID})`, "KG-5");
  check("todolaw.version-semver", "TODOLAW", SEMVER.test(String(man.version)), `manifest.version "${man.version}" is not x.y.z semver`);
  check("todolaw.name-length", "TODOLAW", typeof man.name === "string" && man.name.length >= 1 && man.name.length <= 50, "manifest.name must be 1-50 chars");
  check(
    "todolaw.displayname-length",
    "TODOLAW",
    typeof man.displayName === "string" && man.displayName.length >= 1 && man.displayName.length <= 100,
    "manifest.displayName must be 1-100 chars"
  );
  check("todolaw.jurisdictions", "TODOLAW", Array.isArray(man.jurisdictions) && man.jurisdictions.length >= 1, "manifest.jurisdictions must be non-empty");
  check("todolaw.languages", "TODOLAW", Array.isArray(man.languages) && man.languages.length >= 1, "manifest.languages must be non-empty");
  check(
    "todolaw.assessment-type-routing",
    "TODOLAW",
    isAssessment ? man.assessmentType != null : man.assessmentType == null,
    isAssessment
      ? "assessment skill missing manifest.assessmentType — build-skills.mjs would package it as a contract skill"
      : "contract skill carries manifest.assessmentType — build-skills.mjs would package it as an assessment"
  );
}

if (!isAssessment) {
  const clauses = readJson(skillDir, "clauses.json");
  check("todolaw.clauses-exist", "TODOLAW", clauses.exists, "clauses.json required for contract skills");
  if (clauses.json) {
    const c = clauses.json;
    check("todolaw.clauses-contract-type", "TODOLAW", typeof c.contractType === "string" && c.contractType.length > 0, "clauses.contractType missing");
    check("todolaw.clauses-nonempty", "TODOLAW", Array.isArray(c.clauses) && c.clauses.length > 0, "clauses.clauses must be a non-empty array");
    let shapeOk = true;
    let shapeDetail = "";
    for (const cl of c.clauses || []) {
      if (!Array.isArray(cl.options) || cl.options.length < 3) {
        shapeOk = false;
        shapeDetail = `clause ${cl.id}: fewer than 3 options`;
        break;
      }
      const ids = cl.options.map((o) => o.id);
      if (new Set(ids).size !== ids.length) {
        shapeOk = false;
        shapeDetail = `clause ${cl.id}: duplicate option ids`;
        break;
      }
    }
    check("todolaw.clause-options", "TODOLAW", shapeOk, shapeDetail || "every clause needs >=3 options with unique ids");
  }
  const bp = readJson(skillDir, "boilerplate.json");
  check("todolaw.boilerplate-exists", "TODOLAW", bp.exists, "boilerplate.json required for contract skills");
  if (bp.json) {
    check("todolaw.boilerplate-nonempty", "TODOLAW", typeof bp.json === "object" && Object.keys(bp.json).length > 0, "boilerplate.json must be a non-empty object");
  }
} else {
  check("todolaw.template-exists", "TODOLAW", template.exists, "template.json required for assessment skills (DPO Central installer input)");
  if (template.json) {
    const t = template.json;
    check("todolaw.template-type", "TODOLAW", typeof t.type === "string" && t.type.length > 0, "template.type missing");
    check("todolaw.template-sections", "TODOLAW", Array.isArray(t.sections) && t.sections.length > 0, "template.sections must be non-empty");
    const allHaveQuestions = (t.sections || []).every((s) => Array.isArray(s.questions) && s.questions.length > 0);
    check("todolaw.template-questions", "TODOLAW", allHaveQuestions, "every template section needs a non-empty questions array");
  }
}

// ── Report ───────────────────────────────────────────────────────────────────

const failures = results.filter((r) => !r.ok && r.level === "error");
const warnings = results.filter((r) => !r.ok && r.level === "warn");
const unexpected = failures.filter((r) => !(r.kg && expectedFail.has(r.kg)));

console.log(`\nConformance: ${dirName} (${skillType})\n`);
for (const r of results) {
  if (r.ok) continue;
  const tag = r.level === "error" ? (r.kg && expectedFail.has(r.kg) ? "EXPECTED-FAIL" : "FAIL") : "WARN";
  console.log(`  [${tag}] (${r.authority}) ${r.id}${r.kg ? ` [${r.kg}]` : ""} — ${r.detail}`);
}
const passed = results.filter((r) => r.ok).length;
console.log(`\n  ${passed}/${results.length} checks passed · ${failures.length} errors (${unexpected.length} unexpected) · ${warnings.length} warnings`);

const output = {
  skill: dirName,
  type: skillType,
  passed,
  total: results.length,
  unexpectedErrors: unexpected.map((r) => r.id),
  expectedErrors: failures.filter((r) => r.kg && expectedFail.has(r.kg)).map((r) => r.id),
  warnings: warnings.map((r) => r.id),
  results,
};
const jsonOut = flag("json");
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(output, null, 2));

process.exit(unexpected.length > 0 ? 2 : 0);
