import { generateObject } from "ai";
import { z } from "zod";

/**
 * Skill-specific eval generation (OPEN-ISSUES #10).
 *
 * Replaces the static evals skeleton with cases grounded in the actual skill
 * content, following the lq-skills evals convention (evals/README.md):
 * a POSITIVE case exercising the skill's flagship substance, a CURRENCY case
 * probing the position most likely to go stale, and a NEGATIVE/gating case
 * the skill must block or warn on. Evals are AI-drafted and must be verified
 * by a lawyer before being relied on — the exporter's README says so.
 */

export const evalsGenerationSchema = z.object({
  evals: z
    .array(
      z.object({
        id: z.number().describe("1-based sequence number"),
        kind: z
          .string()
          .nullish()
          .describe("One of: 'positive', 'currency', 'negative'"),
        prompt: z
          .string()
          .describe(
            "A realistic user request, phrased the way a real user would type it — not an idealised demo input"
          ),
        expected_output: z
          .string()
          .describe(
            "What the skill's output must contain, naming the specific clauses/criteria, positions, or statutory anchors that must appear"
          ),
        assertions: z
          .array(
            z.object({
              text: z
                .string()
                .describe(
                  "One objectively checkable statement about the output (names a concrete clause, option, criterion, deadline, or warning)"
                ),
            })
          )
          .min(1)
          .max(4),
      })
    )
    .min(3)
    .max(5),
});

export type EvalsGenerationResult = z.infer<typeof evalsGenerationSchema>;

function resolveLocalized(value: unknown, lang: string): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const rec = value as Record<string, string>;
    return rec[lang] || Object.values(rec)[0] || "";
  }
  return "";
}

/** Compact content summary the eval prompt can ground itself in. */
function summarizeContract(clausesJson: unknown, lang: string): string {
  const clauses =
    (clausesJson as { clauses?: Array<Record<string, unknown>> } | null)
      ?.clauses || [];
  return clauses
    .slice(0, 30)
    .map((c) => {
      const title = resolveLocalized(c.title, lang);
      const options = Array.isArray(c.options)
        ? (c.options as Array<Record<string, unknown>>)
            .map((o) => resolveLocalized(o.label, lang))
            .filter(Boolean)
            .join(" / ")
        : "";
      return `- ${title}${options ? ` (options: ${options})` : ""}`;
    })
    .join("\n");
}

function summarizeAssessment(assessmentJson: unknown): string {
  const categories =
    (assessmentJson as { categories?: Array<Record<string, unknown>> } | null)
      ?.categories || [];
  return categories
    .map((cat) => {
      const criteria = Array.isArray(cat.criteria)
        ? (cat.criteria as Array<Record<string, unknown>>)
            .map((cr) => `${cr.title} [${cr.riskLevel || "medium"}]`)
            .join("; ")
        : "";
      return `- ${cat.title}: ${criteria}`;
    })
    .join("\n");
}

export function buildEvalsGenerationPrompt(args: {
  displayName: string;
  isAssessment: boolean;
  jurisdictions: string[];
  language: string;
  clausesJson: unknown;
  assessmentJson: unknown;
}): string {
  const content = args.isAssessment
    ? summarizeAssessment(args.assessmentJson)
    : summarizeContract(args.clausesJson, args.language);

  return `You are a legal-skill QA author. Write evaluation cases for the following ${
    args.isAssessment ? "compliance assessment" : "contract drafting"
  } skill, for its evals/evals.json file.

SKILL: ${args.displayName}
JURISDICTION(S): ${args.jurisdictions.join(", ") || "agnostic"}
LANGUAGE: ${args.language}

SKILL CONTENT (${args.isAssessment ? "categories and criteria" : "clauses and options"}):
${content}

Write exactly 3 evaluation cases:
1. POSITIVE (kind: "positive") — a realistic user request exercising the skill's flagship substance. The expected output names the specific ${
    args.isAssessment ? "criteria and risk levels" : "clauses and options"
  } that must appear.
2. CURRENCY (kind: "currency") — a request that would expose stale law: target the position in this content most likely to have moved recently in the stated jurisdiction(s). The expected output states the current position and carries a dated verification note.
3. NEGATIVE / gating (kind: "negative") — a request for something this skill must refuse, block, or warn on (wrong jurisdiction, unlawful ${
    args.isAssessment ? "processing the assessment must flag as non-compliant" : "clause combination or void option"
  }). The expected output is the block or the mandatory warning — never a silent answer.

Rules:
- Every assertion must be objectively checkable against the output (name a concrete ${
    args.isAssessment ? "criterion, score, or flag" : "clause, option, or term"
  } — no vague "output is helpful").
- Ground every case in the SKILL CONTENT above; do not invent clauses or criteria that are not listed.
- Write prompts the way a real ${args.language === "es" ? "Spanish-speaking " : ""}user would type them.`;
}

export async function runEvalsGeneration(
  model: Parameters<typeof generateObject>[0]["model"],
  args: Parameters<typeof buildEvalsGenerationPrompt>[0]
): Promise<EvalsGenerationResult> {
  const result = await generateObject({
    model,
    schema: evalsGenerationSchema,
    prompt: buildEvalsGenerationPrompt(args),
    maxTokens: 8192,
  });
  return result.object;
}
