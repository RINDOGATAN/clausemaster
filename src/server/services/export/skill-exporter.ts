import { mkdir, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { Octokit } from "@octokit/rest";
import prisma from "@/lib/prisma";
import { isOpenLicense, skillPublishingConfig } from "@/config/skill-publishing";
import { APACHE_2_0_LICENSE } from "./licenses";

const GITHUB_OWNER = process.env.LEGALSKILLS_GITHUB_OWNER || "RINDOGATAN";
const GITHUB_REPO = process.env.LEGALSKILLS_GITHUB_REPO || "legalskills";
const GITHUB_BRANCH = process.env.LEGALSKILLS_GITHUB_BRANCH || "main";

export async function exportSkillDraft(
  skillDraftId: string,
  outputDir?: string
): Promise<string> {
  const draft = await prisma.skillDraft.findUnique({
    where: { id: skillDraftId },
    include: {
      analysis: {
        include: {
          document: {
            select: {
              userId: true,
              user: {
                select: {
                  email: true,
                  name: true,
                  publisherProfile: {
                    select: {
                      firmName: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!draft) {
    throw new Error("Skill draft not found");
  }

  if (draft.status !== "REVIEW" && draft.status !== "APPROVED") {
    throw new Error(`Cannot export draft in status "${draft.status}". Must be in REVIEW or APPROVED status.`);
  }

  const isAssessment = draft.skillType === "ASSESSMENT";

  if (isAssessment) {
    if (!draft.assessmentJson || !draft.metadataJson || !draft.manifestJson) {
      throw new Error("Assessment skill draft is missing required data");
    }
  } else {
    if (!draft.clausesJson || !draft.boilerplateJson || !draft.metadataJson || !draft.manifestJson) {
      throw new Error("Skill draft is missing required data");
    }
  }

  // Enrich manifest with publisher info for downstream platforms (Dealroom, DPO Central, AI Sentinel)
  const publisher = draft.analysis?.document?.user;
  const profile = publisher?.publisherProfile;
  const manifestData = draft.manifestJson as Record<string, unknown> | null;

  const license =
    (manifestData?.license as string | undefined) ||
    skillPublishingConfig.defaultLicense;

  // Author string for the LQ-facing SKILL.md frontmatter, captured before the
  // manifest author is rewritten into an object below.
  const authorName =
    profile?.firmName ||
    publisher?.name ||
    (typeof manifestData?.author === "string"
      ? (manifestData.author as string)
      : skillPublishingConfig.author);

  // No payout identity in manifests: the rev-share model is scrapped —
  // premium licensing is first-party only, orthogonal to authoring.
  if (manifestData && publisher) {
    manifestData.author = {
      name: profile?.firmName || publisher.name || "Unknown",
      email: publisher.email,
    };
  }

  // Derive directory name from contractType (lowercase, hyphenated)
  const dirName = (draft.contractType || "contract")
    .toLowerCase()
    .replace(/[_\s]+/g, "-");

  const metadata = (draft.metadataJson as Record<string, unknown>) || {};
  const lang = primaryLanguage(metadata, manifestData);

  // Derive the parameter/token list from the assembled legal text (clauses +
  // boilerplate). Assessment skills have no clause engine, so this is empty.
  const parameters = isAssessment
    ? []
    : deriveParameters(draft.clausesJson, draft.boilerplateJson, lang);

  // Build the file set we want to publish
  const files: Array<{ name: string; content: string }> = [];
  if (isAssessment) {
    // The suite packager (todolaw/scripts/build-skills.mjs) requires
    // template.json for assessment skills, and the DPO Central installer
    // enforces template.type === manifest.assessmentType against its enum —
    // normalize the AI's free-form type and rewrite the manifest to match.
    const normalizedType = normalizeAssessmentType(
      (manifestData?.assessmentType as string) || "",
      draft.destination
    );
    if (manifestData) manifestData.assessmentType = normalizedType;
    files.push({
      name: "template.json",
      content: JSON.stringify(
        buildTemplateJson({
          assessmentJson: draft.assessmentJson,
          type: normalizedType,
          name: draft.displayName || dirName,
          metadata,
          manifestData,
          lang,
        }),
        null,
        2
      ),
    });
    // Full-fidelity Clausemaster source (guidance, remediation, scoring detail)
    // kept alongside the installer-facing template.
    files.push({ name: "assessment.json", content: JSON.stringify(draft.assessmentJson, null, 2) });
    if (draft.guidanceJson) {
      files.push({ name: "guidance.json", content: JSON.stringify(draft.guidanceJson, null, 2) });
    }
  } else {
    files.push({ name: "clauses.json", content: JSON.stringify(draft.clausesJson, null, 2) });
    files.push({ name: "boilerplate.json", content: JSON.stringify(draft.boilerplateJson, null, 2) });
  }
  files.push({ name: "metadata.json", content: JSON.stringify(draft.metadataJson, null, 2) });
  files.push({ name: "manifest.json", content: JSON.stringify(draft.manifestJson, null, 2) });

  // LQ.AI-compatible artifacts: SKILL.md with lq_ai frontmatter, the derived
  // parameters.json, and an evals skeleton.
  files.push({
    name: "SKILL.md",
    content: buildSkillMd({
      dirName,
      displayName: draft.displayName || dirName,
      author: authorName,
      version: (manifestData?.version as string) || "1.0.0",
      isAssessment,
      metadata,
      manifestData,
      parameters,
      clausesJson: draft.clausesJson,
      assessmentJson: draft.assessmentJson,
      lang,
    }),
  });
  files.push({
    name: "parameters.json",
    content: JSON.stringify({ version: "1.0", parameters }, null, 2),
  });
  // Skill-specific evals generated during drafting (evalsJson); the static
  // skeleton remains the fallback for drafts predating the evals step or
  // where generation failed.
  files.push({
    name: "evals/evals.json",
    content: JSON.stringify(
      buildEvalsContent(dirName, metadata, draft.evalsJson),
      null,
      2
    ),
  });

  files.push({
    name: "README.md",
    content: buildReadme({
      displayName: draft.displayName || dirName,
      description:
        resolveLocalized(metadata.description, lang) ||
        `A ${draft.displayName || dirName} skill authored with Clausemaster.`,
      isAssessment,
      manifestData,
      author: authorName,
      license,
      lang,
    }),
  });

  // Open skills ship with their license text; the packager includes LICENSE
  // in the signed archive when present. Proprietary (first-party premium)
  // skills get their EULA from the todolaw packaging pipeline instead.
  // The lq-skills community gate requires a LICENSE file for every skill, so
  // open licenses without bundled text still get a pointer file.
  if (isOpenLicense(license)) {
    files.push({
      name: "LICENSE",
      content:
        license === "Apache-2.0"
          ? APACHE_2_0_LICENSE
          : `This skill is licensed under the ${license} license.\nSee https://spdx.org/licenses/${license}.html for the full text.\n`,
    });
  }

  validateExportedFiles(files, { isAssessment, manifestData });

  const githubToken = process.env.LEGALSKILLS_GITHUB_TOKEN;
  let exportPath: string;

  if (githubToken) {
    exportPath = await commitToGitHub({
      token: githubToken,
      dirName,
      files,
      message: `Publish skill: ${draft.displayName || dirName}`,
      authorName: profile?.firmName || publisher?.name || "Clausemaster",
      authorEmail: publisher?.email || "noreply@todo.law",
    });
  } else {
    exportPath = await writeToFilesystem({
      baseDir: outputDir || process.env.LEGALSKILLS_DIR || "../legalskills",
      dirName,
      files,
    });
  }

  await prisma.skillDraft.update({
    where: { id: skillDraftId },
    data: {
      status: "EXPORTED",
      exportedAt: new Date(),
      exportPath,
    },
  });

  return exportPath;
}

async function writeToFilesystem(args: {
  baseDir: string;
  dirName: string;
  files: Array<{ name: string; content: string }>;
}): Promise<string> {
  const skillDir = join(args.baseDir, args.dirName);
  await mkdir(skillDir, { recursive: true });
  await Promise.all(
    args.files.map(async (f) => {
      const filePath = join(skillDir, f.name);
      // Some files live in subdirectories (e.g. evals/evals.json).
      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, f.content, "utf-8");
    })
  );
  return skillDir;
}

async function commitToGitHub(args: {
  token: string;
  dirName: string;
  files: Array<{ name: string; content: string }>;
  message: string;
  authorName: string;
  authorEmail: string;
}): Promise<string> {
  const octokit = new Octokit({ auth: args.token });
  const owner = GITHUB_OWNER;
  const repo = GITHUB_REPO;
  const branch = GITHUB_BRANCH;

  // 1. Get latest commit SHA on branch
  const { data: ref } = await octokit.rest.git.getRef({
    owner,
    repo,
    ref: `heads/${branch}`,
  });
  const latestCommitSha = ref.object.sha;

  // 2. Get base tree from that commit
  const { data: latestCommit } = await octokit.rest.git.getCommit({
    owner,
    repo,
    commit_sha: latestCommitSha,
  });
  const baseTreeSha = latestCommit.tree.sha;

  // 3. Create blobs for each file
  const blobs = await Promise.all(
    args.files.map((f) =>
      octokit.rest.git.createBlob({
        owner,
        repo,
        content: f.content,
        encoding: "utf-8",
      })
    )
  );

  // 4. Create new tree with the new blobs layered on top of base
  const { data: newTree } = await octokit.rest.git.createTree({
    owner,
    repo,
    base_tree: baseTreeSha,
    tree: args.files.map((f, i) => ({
      path: `${args.dirName}/${f.name}`,
      mode: "100644",
      type: "blob",
      sha: blobs[i].data.sha,
    })),
  });

  // 5. Create new commit pointing to the new tree
  const { data: newCommit } = await octokit.rest.git.createCommit({
    owner,
    repo,
    message: args.message,
    tree: newTree.sha,
    parents: [latestCommitSha],
    author: {
      name: args.authorName,
      email: args.authorEmail,
    },
  });

  // 6. Move the branch ref forward
  await octokit.rest.git.updateRef({
    owner,
    repo,
    ref: `heads/${branch}`,
    sha: newCommit.sha,
  });

  return `https://github.com/${owner}/${repo}/tree/${branch}/${args.dirName}`;
}

// ---------------------------------------------------------------------------
// LQ.AI-compatible artifact builders (SKILL.md, parameters.json, evals)
// ---------------------------------------------------------------------------

function primaryLanguage(
  metadata: Record<string, unknown>,
  manifestData: Record<string, unknown> | null
): string {
  const fromMeta = (metadata.languages as string[] | undefined)?.[0];
  const fromManifest = (manifestData?.languages as string[] | undefined)?.[0];
  return fromMeta || fromManifest || "en";
}

/** Recursively collect every string value in a JSON-ish structure. */
function collectStrings(value: unknown, out: string[]): void {
  if (typeof value === "string") {
    out.push(value);
  } else if (Array.isArray(value)) {
    for (const v of value) collectStrings(v, out);
  } else if (value && typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) {
      collectStrings(v, out);
    }
  }
}

interface DerivedParameter {
  id: string;
  token: string;
  type: string;
  required: boolean;
  label: Record<string, string>;
  hint: Record<string, string>;
}

/**
 * Derive the parameter/token list from assembled legal text. Fill-in tokens
 * are written as UPPERCASE bracketed placeholders (e.g. `[START DATE]`,
 * `[AMOUNT]`) in clause option text and boilerplate; lowercase brackets like
 * `[three]` or `[monthly/quarterly]` are inline drafting choices, not
 * parameters, and are excluded.
 */
function deriveParameters(
  clausesJson: unknown,
  boilerplateJson: unknown,
  lang: string
): DerivedParameter[] {
  const strings: string[] = [];
  collectStrings(clausesJson, strings);
  collectStrings(boilerplateJson, strings);

  const tokenRe = /\[([A-Z][A-Z0-9 /'’.\-]*)\]/g;
  const seen = new Set<string>();
  const params: DerivedParameter[] = [];

  for (const s of strings) {
    let m: RegExpExecArray | null;
    while ((m = tokenRe.exec(s)) !== null) {
      const raw = m[1].trim();
      const token = raw.toLowerCase();
      if (seen.has(token)) continue;
      seen.add(token);
      params.push({
        id: slugify(token),
        token,
        type: inferParamType(token),
        required: false,
        label: { [lang]: titleCase(token) },
        hint: { [lang]: `Value for "${token}"` },
      });
    }
  }

  return params;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleCase(value: string): string {
  return value.replace(/\S+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
}

function inferParamType(token: string): string {
  if (/\bdate\b/.test(token)) return "date";
  if (/amount|salary|price|\bfee\b|payment|value/.test(token)) return "currency";
  if (/percent|percentage|\bpct\b|\brate\b/.test(token)) return "percentage";
  if (/number|\bdays\b|count|quantity|shares/.test(token)) return "number";
  return "text";
}

/** Render a string as a valid YAML double-quoted scalar. */
function yamlScalar(value: string): string {
  return JSON.stringify(value);
}

function yamlFlowList(items: string[]): string {
  return `[${items.map(yamlScalar).join(", ")}]`;
}

function buildSkillMd(args: {
  dirName: string;
  displayName: string;
  author: string;
  version: string;
  isAssessment: boolean;
  metadata: Record<string, unknown>;
  manifestData: Record<string, unknown> | null;
  parameters: DerivedParameter[];
  clausesJson: unknown;
  assessmentJson: unknown;
  lang: string;
}): string {
  const { metadata, manifestData, parameters, lang } = args;

  const description =
    resolveLocalized(metadata.description, lang) ||
    `Use when the user wants to draft or work with a ${args.displayName}.`;

  const jurisdictions = (
    (manifestData?.jurisdictions as string[] | undefined) ||
    (metadata.jurisdictions as string[] | undefined) ||
    []
  ).filter((j) => j && j !== "UNKNOWN");

  const tags = deriveTags(metadata, args.isAssessment);
  const triggers = deriveTriggerExamples(args.displayName, args.isAssessment);

  const required = parameters.filter((p) => p.required);
  const optional = parameters.filter((p) => !p.required);

  const lines: string[] = [];
  lines.push("---");
  lines.push(`name: ${args.dirName}`);
  lines.push(`description: ${yamlScalar(description)}`);
  lines.push("lq_ai:");
  lines.push(`  title: ${yamlScalar(args.displayName)}`);
  lines.push(`  version: ${yamlScalar(args.version)}`);
  lines.push(`  author: ${yamlScalar(args.author)}`);
  lines.push(`  tags: ${yamlFlowList(tags)}`);
  lines.push(
    `  jurisdiction: ${
      jurisdictions.length === 0
        ? "agnostic"
        : jurisdictions.length === 1
        ? yamlScalar(jurisdictions[0].toLowerCase())
        : yamlFlowList(jurisdictions.map((j) => j.toLowerCase()))
    }`
  );
  lines.push("  trigger_examples:");
  for (const t of triggers) lines.push(`    - ${yamlScalar(t)}`);
  lines.push("  output_format: markdown");

  // `inputs:` lives at the TOP level (the authoring guide's formal shape):
  // the LQ.AI api reads top-level first and the gateway's required-input
  // enforcement reads ONLY the top level — nesting under lq_ai would render
  // in the form UI but silently escape gateway enforcement.
  if (required.length === 0 && optional.length === 0) {
    lines.push("inputs: {}");
  } else {
    lines.push("inputs:");
    if (required.length > 0) {
      lines.push("  required:");
      for (const p of required) appendInput(lines, p, lang);
    }
    if (optional.length > 0) {
      lines.push("  optional:");
      for (const p of optional) appendInput(lines, p, lang);
    }
  }
  lines.push("---");
  lines.push("");

  // Body
  lines.push(`# ${args.displayName}`);
  lines.push("");
  lines.push(description);
  lines.push("");

  if (args.isAssessment) {
    const categories = collectAssessmentCategories(args.assessmentJson);
    if (categories.length > 0) {
      lines.push("## Assessment categories");
      lines.push("");
      for (const c of categories) lines.push(`- ${c}`);
      lines.push("");
    }
  } else {
    const clauseTitles = collectClauseTitles(args.clausesJson, lang);
    if (clauseTitles.length > 0) {
      lines.push("## Clauses covered");
      lines.push("");
      for (const c of clauseTitles) lines.push(`- ${c}`);
      lines.push("");
    }
  }

  if (jurisdictions.length > 0) {
    lines.push("## Jurisdictions");
    lines.push("");
    for (const j of jurisdictions) lines.push(`- ${j}`);
    lines.push("");
  }

  if (parameters.length > 0) {
    lines.push("## Parameters");
    lines.push("");
    for (const p of parameters) {
      lines.push(`- **${p.label[lang] || p.token}** (\`${p.token}\`, ${p.type})`);
    }
    lines.push("");
  }

  const license =
    (manifestData?.license as string | undefined) || "Apache-2.0";
  lines.push("## License");
  lines.push("");
  lines.push(`Published under the ${license} license.`);
  lines.push("");

  return lines.join("\n");
}

function appendInput(
  lines: string[],
  p: DerivedParameter,
  lang: string
): void {
  lines.push(`    - name: ${p.id}`);
  lines.push(`      type: ${p.type}`);
  lines.push(
    `      description: ${yamlScalar(p.hint[lang] || p.label[lang] || p.token)}`
  );
}

function resolveLocalized(value: unknown, lang: string): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const v = obj[lang] ?? Object.values(obj)[0];
    if (typeof v === "string") return v;
  }
  return undefined;
}

function deriveTags(
  metadata: Record<string, unknown>,
  isAssessment: boolean
): string[] {
  const tags: string[] = [];
  const category = resolveLocalized(metadata.category, "en");
  if (category) tags.push(slugify(category));
  const contractType = metadata.contractType;
  if (typeof contractType === "string") tags.push(slugify(contractType));
  tags.push(isAssessment ? "assessment" : "contract");
  return Array.from(new Set(tags.filter(Boolean)));
}

function deriveTriggerExamples(
  displayName: string,
  isAssessment: boolean
): string[] {
  const name = displayName.toLowerCase();
  if (isAssessment) {
    return [
      `assess a ${name}`,
      `run the ${name} assessment`,
      `score against the ${name} criteria`,
    ];
  }
  return [`draft a ${name}`, `generate a ${name}`, `create a ${name}`];
}

function collectClauseTitles(clausesJson: unknown, lang: string): string[] {
  const titles: string[] = [];
  const clauses = (clausesJson as { clauses?: unknown[] } | null)?.clauses;
  if (Array.isArray(clauses)) {
    for (const c of clauses) {
      const title = resolveLocalized(
        (c as Record<string, unknown>).title,
        lang
      );
      if (title) titles.push(title);
    }
  }
  return titles;
}

// ---------------------------------------------------------------------------
// Assessment template builder (installer-facing template.json)
// ---------------------------------------------------------------------------

/**
 * Map the AI's free-form assessment type onto the destination installer's
 * enum. DPO Central validates against {DPIA, PIA, TIA, LIA, VENDOR, CUSTOM};
 * AI Sentinel skills use the AIS framework types (CONFORMITY, BIAS_FAIRNESS).
 * Anything unrecognized becomes CUSTOM so the install never fails validation.
 */
export function normalizeAssessmentType(
  raw: string,
  destination: string | null
): string {
  const upper = raw.toUpperCase();
  if (destination === "AI_SENTINEL") {
    if (/CONFORMITY/.test(upper)) return "CONFORMITY";
    if (/BIAS|FAIRNESS/.test(upper)) return "BIAS_FAIRNESS";
    return "CUSTOM";
  }
  if (/DPIA|DATA PROTECTION IMPACT/.test(upper)) return "DPIA";
  if (/TIA|TRANSFER IMPACT/.test(upper)) return "TIA";
  if (/LIA|LEGITIMATE INTEREST/.test(upper)) return "LIA";
  if (/VENDOR/.test(upper)) return "VENDOR";
  if (/PIA|PRIVACY IMPACT/.test(upper)) return "PIA";
  return "CUSTOM";
}

interface AssessmentCriterion {
  id: string;
  title: string;
  description?: string;
  order?: number;
  riskLevel?: "low" | "medium" | "high" | "critical";
  regulatoryReference?: string;
  guidance?: string;
  remediation?: string;
  evidenceRequired?: string;
  scoringOptions?: Array<{ id: string; label: string; score: number; description?: string }>;
}

interface AssessmentCategory {
  id: string;
  title: string;
  description?: string;
  order?: number;
  criteria?: AssessmentCriterion[];
}

const RISK_WEIGHTS: Record<string, number> = {
  low: 1,
  medium: 1.5,
  high: 2,
  critical: 3,
};

/**
 * Transform Clausemaster's assessmentJson (categories/criteria with guidance
 * and 0-100 compliance scoringOptions) into the DPO Central installer's
 * template shape (sections/questions with 0-100 riskScore options, where
 * higher = riskier — the inverse of the compliance score).
 */
export function buildTemplateJson(input: {
  assessmentJson: unknown;
  type: string;
  name: string;
  metadata: Record<string, unknown>;
  manifestData: Record<string, unknown> | null;
  lang: string;
}): unknown {
  const { assessmentJson, type, name, metadata, manifestData, lang } = input;
  const source = (assessmentJson as { categories?: AssessmentCategory[] } | null) || {};
  const scoringMethod = (assessmentJson as { scoringMethod?: string } | null)?.scoringMethod;

  const categories = [...(source.categories || [])].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0)
  );

  const frameworkRefs = new Set<string>();
  const sections = categories.map((cat) => ({
    id: cat.id,
    title: cat.title,
    ...(cat.description ? { description: cat.description } : {}),
    questions: [...(cat.criteria || [])]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((criterion) => {
        if (criterion.regulatoryReference) frameworkRefs.add(criterion.regulatoryReference);
        const helpText = [
          criterion.guidance,
          criterion.remediation ? `Remediation: ${criterion.remediation}` : undefined,
          criterion.evidenceRequired ? `Evidence: ${criterion.evidenceRequired}` : undefined,
        ]
          .filter(Boolean)
          .join(" ");
        const options = criterion.scoringOptions?.map((opt) => ({
          value: opt.id,
          label: opt.label,
          riskScore: Math.max(0, Math.min(100, 100 - opt.score)),
        }));
        return {
          id: criterion.id,
          text: criterion.description || criterion.title,
          type: options?.length ? ("select" as const) : ("textarea" as const),
          ...(options?.length ? { options } : {}),
          required: true,
          riskWeight: RISK_WEIGHTS[criterion.riskLevel || "medium"],
          ...(helpText ? { helpText } : {}),
        };
      }),
  }));

  const description =
    (metadata.description as Record<string, string> | undefined)?.[lang] ||
    (typeof metadata.description === "string" ? metadata.description : undefined);

  return {
    type,
    name,
    ...(description ? { description } : {}),
    version: (manifestData?.version as string) || (metadata.version as string) || "1.0",
    ...(frameworkRefs.size
      ? { frameworkRef: [...frameworkRefs].slice(0, 8).join("; ") }
      : {}),
    sections,
    scoringLogic: {
      method: scoringMethod === "checklist" ? "sum" : "weighted_average",
      thresholds: { low: 25, medium: 50, high: 75, critical: 90 },
    },
  };
}

function collectAssessmentCategories(assessmentJson: unknown): string[] {
  const names: string[] = [];
  const categories = (assessmentJson as { categories?: unknown[] } | null)
    ?.categories;
  if (Array.isArray(categories)) {
    for (const c of categories) {
      const obj = c as Record<string, unknown>;
      const name =
        (typeof obj.name === "string" && obj.name) ||
        (typeof obj.title === "string" && obj.title) ||
        (typeof obj.id === "string" && obj.id);
      if (name) names.push(name as string);
    }
  }
  return names;
}

function buildReadme(args: {
  displayName: string;
  description: string;
  isAssessment: boolean;
  manifestData: Record<string, unknown> | null;
  author: string;
  license: string;
  lang: string;
}): string {
  const jurisdictions =
    ((args.manifestData?.jurisdictions as string[] | undefined) || []).filter(
      (j) => j && j !== "UNKNOWN"
    );
  const languages = (args.manifestData?.languages as string[] | undefined) || [args.lang];

  const lines: string[] = [];
  lines.push(`# ${args.displayName}`);
  lines.push("");
  lines.push(args.description);
  lines.push("");
  lines.push("## What's inside");
  lines.push("");
  lines.push("- `SKILL.md` — agent-facing instructions (agentskills format, runs in any LQ.AI / LegalQuants-community runtime)");
  if (args.isAssessment) {
    lines.push("- `template.json` — structured assessment template for the todo.law suite (DPO Central installer input)");
    lines.push("- `assessment.json` / `guidance.json` — full-fidelity criteria and per-criterion guidance");
  } else {
    lines.push("- `clauses.json` / `boilerplate.json` — clause engine data for the todo.law suite (Dealroom)");
    lines.push("- `parameters.json` — fill-in parameters derived from the clause text");
  }
  lines.push("- `manifest.json` / `metadata.json` — machine-readable metadata");
  lines.push("- `evals/evals.json` — evaluation cases (review and complete before relying on them)");
  lines.push("");
  lines.push("## Compatibility");
  lines.push("");
  lines.push("Dual-format: installable in the todo.law self-hosted suite (as a signed `.skill` package) and loadable by any LQ.AI / LegalQuants-community runtime as a skill folder.");
  if (jurisdictions.length > 0) {
    lines.push("");
    lines.push(`Jurisdictions: ${jurisdictions.join(", ")} · Languages: ${languages.join(", ")}`);
  }
  lines.push("");
  lines.push("## Provenance");
  lines.push("");
  lines.push(`Authored with [Clausemaster](https://clausemaster.todo.law) by ${args.author}. AI-assisted output — have a qualified lawyer review before production use.`);
  lines.push("");
  lines.push(`Licensed under the ${args.license} license.`);
  lines.push("");
  return lines.join("\n");
}

const DEALROOM_SKILL_ID_RE = /^com\.(nel|todolaw)\.skills\.[a-z0-9.-]+$/;
const DPOCENTRAL_SKILL_ID_RE = /^com\.(nel|todolaw)\.(dpocentral|skills)\.[a-z0-9.-]+$/;

/**
 * Pre-publish conformance gate. Mirrors the static rules the downstream
 * installers and the lq-skills community gate enforce, so a malformed skill
 * fails HERE (with a useful message) instead of publishing silently and
 * failing at install/review time. Throws on the first rule set violated.
 */
function validateExportedFiles(
  files: Array<{ name: string; content: string }>,
  opts: { isAssessment: boolean; manifestData: Record<string, unknown> | null }
): void {
  const names = new Set(files.map((f) => f.name));
  const problems: string[] = [];

  const required = opts.isAssessment
    ? ["template.json", "assessment.json", "metadata.json", "manifest.json", "SKILL.md", "README.md", "evals/evals.json"]
    : ["clauses.json", "boilerplate.json", "metadata.json", "manifest.json", "SKILL.md", "README.md", "parameters.json", "evals/evals.json"];
  for (const name of required) {
    if (!names.has(name)) problems.push(`missing required file: ${name}`);
  }

  const man = opts.manifestData || {};
  const skillId = String(man.skillId ?? "");
  const idRe = opts.isAssessment ? DPOCENTRAL_SKILL_ID_RE : DEALROOM_SKILL_ID_RE;
  if (!idRe.test(skillId)) {
    problems.push(
      `skillId "${skillId}" does not match the ${opts.isAssessment ? "DPO Central" : "Dealroom"} installer pattern ${idRe}`
    );
  }
  if (!/^\d+\.\d+\.\d+$/.test(String(man.version ?? ""))) {
    problems.push(`manifest.version "${man.version}" is not x.y.z semver`);
  }
  if (!Array.isArray(man.jurisdictions) || man.jurisdictions.length === 0) {
    problems.push("manifest.jurisdictions must be a non-empty array");
  }
  if (!Array.isArray(man.languages) || man.languages.length === 0) {
    problems.push("manifest.languages must be a non-empty array");
  }
  if (opts.isAssessment && man.assessmentType == null) {
    problems.push("assessment skill manifest is missing assessmentType (packager would route it as a contract skill)");
  }
  if (!opts.isAssessment && man.assessmentType != null) {
    problems.push("contract skill manifest carries assessmentType (packager would route it as an assessment)");
  }

  const skillMd = files.find((f) => f.name === "SKILL.md")?.content || "";
  if (!/^---\r?\n/.test(skillMd)) problems.push("SKILL.md has no YAML frontmatter block");
  if (!/^name: /m.test(skillMd) || !/^description: /m.test(skillMd)) {
    problems.push("SKILL.md frontmatter is missing top-level name/description (the LQ.AI loader would skip the skill)");
  }

  if (problems.length > 0) {
    throw new Error(`Skill failed pre-publish conformance:\n- ${problems.join("\n- ")}`);
  }
}

function buildEvalsContent(
  dirName: string,
  metadata: Record<string, unknown>,
  evalsJson: unknown
): unknown {
  const generated = evalsJson as {
    evals?: Array<Record<string, unknown>>;
  } | null;
  if (!generated || !Array.isArray(generated.evals) || generated.evals.length === 0) {
    return buildEvalsSkeleton(dirName, metadata);
  }
  return {
    skill_name: dirName,
    // Generation date, not an attorney-review date — the README instructs
    // reviewing evals before reliance.
    law_reviewed_as_of: new Date().toISOString().slice(0, 10),
    evals: generated.evals.map((e, i) => ({
      id: typeof e.id === "number" ? e.id : i + 1,
      ...(typeof e.kind === "string" ? { kind: e.kind } : {}),
      prompt: e.prompt,
      expected_output: e.expected_output,
      assertions: e.assertions,
      files: [],
    })),
  };
}

function buildEvalsSkeleton(
  dirName: string,
  metadata: Record<string, unknown>
): unknown {
  const lawReviewedAsOf =
    (typeof metadata.lawReviewedAsOf === "string" && metadata.lawReviewedAsOf) ||
    "YYYY-MM-DD";
  return {
    skill_name: dirName,
    law_reviewed_as_of: lawReviewedAsOf,
    evals: [
      {
        id: 1,
        prompt:
          "POSITIVE eval — a realistic user request exercising the skill's flagship substance (what a real buyer would type, not an idealised demo input).",
        expected_output:
          "Description of the expected assembled document / analysis, naming the specific statutory anchors and encoded positions that must appear.",
        assertions: [
          { text: "Objectively checkable statement 1 (e.g. 'output cites art. X and states the Y-day deadline')." },
          { text: "Objectively checkable statement 2." },
        ],
        files: [],
      },
      {
        id: 2,
        prompt:
          "CURRENCY eval — a request that would expose stale law (the position that moved most recently).",
        expected_output:
          "Output states the current position as of the law_reviewed_as_of date, with a verification note where the law is still moving.",
        assertions: [
          { text: "Output does NOT contain the superseded position (name it)." },
          { text: "Output carries the dated verification note for the supervising lawyer." },
        ],
        files: [],
      },
      {
        id: 3,
        prompt:
          "NEGATIVE / gating eval — a request for a combination the skill must block or warn on (wrong jurisdiction, void clause, unlawful option pair).",
        expected_output:
          "The option is blocked (available:false surfaced) or generated with the mandatory warning; never silently assembled.",
        assertions: [
          { text: "The void/unavailable combination is not produced without the named warning or block." },
        ],
        files: [],
      },
    ],
  };
}
