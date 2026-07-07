import { mkdir, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { Octokit } from "@octokit/rest";
import prisma from "@/lib/prisma";
import { isOpenLicense, skillPublishingConfig } from "@/config/skill-publishing";

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
                      stripeConnectAccountId: true,
                      stripeConnectComplete: true,
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

  // The license drives whether payout identity is attached. Community skills
  // (open / Apache-2.0) must NOT carry a stripeConnectAccountId; only
  // proprietary skills get the payout identity for monetization.
  const license =
    (manifestData?.license as string | undefined) ||
    skillPublishingConfig.defaultLicense;
  const skillIsOpen = isOpenLicense(license);

  // Author string for the LQ-facing SKILL.md frontmatter, captured before the
  // manifest author is rewritten into an object below.
  const authorName =
    profile?.firmName ||
    publisher?.name ||
    (typeof manifestData?.author === "string"
      ? (manifestData.author as string)
      : skillPublishingConfig.author);

  if (manifestData && publisher) {
    manifestData.author = {
      name: profile?.firmName || publisher.name || "Unknown",
      email: publisher.email,
      ...(!skillIsOpen && profile?.stripeConnectAccountId && profile.stripeConnectComplete
        ? { stripeConnectAccountId: profile.stripeConnectAccountId }
        : {}),
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
  files.push({
    name: "evals/evals.json",
    content: JSON.stringify(buildEvalsSkeleton(dirName, metadata), null, 2),
  });

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

  if (required.length === 0 && optional.length === 0) {
    lines.push("  inputs: {}");
  } else {
    lines.push("  inputs:");
    if (required.length > 0) {
      lines.push("    required:");
      for (const p of required) appendInput(lines, p, lang);
    }
    if (optional.length > 0) {
      lines.push("    optional:");
      for (const p of optional) appendInput(lines, p, lang);
    }
  }
  lines.push("  output_format: markdown");
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
  lines.push(`      - name: ${p.id}`);
  lines.push(`        type: ${p.type}`);
  lines.push(
    `        description: ${yamlScalar(p.hint[lang] || p.label[lang] || p.token)}`
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
