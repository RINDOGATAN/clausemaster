import { generateObject } from "ai";
import { getAIModel, getProviderInfo } from "./provider";
import type { AIConfig } from "../resolve-ai-config";
import {
  criteriaExtractionSchema,
  guidanceGenerationSchema,
} from "./schemas";
import type {
  CriteriaExtractionResult,
  GuidanceGenerationResult,
} from "./schemas";
import {
  buildCriteriaExtractionPrompt,
  buildGuidanceGenerationPrompt,
} from "./prompts";
import { runEvalsGeneration } from "./evals-generator";
import prisma from "@/lib/prisma";
import { skillPublishingConfig } from "@/config/skill-publishing";
import type { SkillDraftStepResult } from "./skill-generator";

/**
 * Run exactly ONE step of assessment skill generation and persist it. The
 * client calls this repeatedly until `done` — each call fits inside Vercel
 * Hobby's 10s function cap. The draft row is created by the router with
 * status GENERATING; progress is marked by which JSON fields are filled:
 *   no assessmentJson -> criteria extraction (stored without guidance)
 *   no metadataJson   -> guidance generation + merge
 *   else              -> skill-specific evals, then REVIEW
 */
export async function runAssessmentDraftStep(
  draftId: string,
  aiConfig: AIConfig
): Promise<SkillDraftStepResult> {
  const draft = await prisma.skillDraft.findUnique({
    where: { id: draftId },
    include: {
      analysis: {
        include: { document: { select: { status: true } } },
      },
    },
  });

  if (!draft) {
    throw new Error("Skill draft not found");
  }

  if (draft.status !== "GENERATING") {
    return { done: true, status: draft.status, step: null };
  }

  const analysis = draft.analysis;
  let step: SkillDraftStepResult["step"] = null;

  try {
    if (!analysis.document || analysis.document.status !== "COMPLETED") {
      throw new Error("Analysis must be completed before generating an assessment skill");
    }

    const model = getAIModel(aiConfig);
    const providerInfo = getProviderInfo(aiConfig);

    // Build classification object from analysis fields
    const classification = {
      contractType: analysis.contractType || "OTHER",
      contractTypeLabel: analysis.contractTypeLabel || analysis.contractType || "Assessment",
      jurisdiction: analysis.jurisdiction as "CALIFORNIA" | "ENGLAND_WALES" | "SPAIN" | "UNKNOWN",
      jurisdictionNotes: analysis.jurisdictionNotes || undefined,
      partyNames: analysis.partyNames,
      effectiveDate: analysis.effectiveDate || undefined,
      summary: analysis.summary || "",
      documentCategory: "assessment" as const,
      partyMode: undefined,
      suggestedDestination: (analysis.suggestedDestination || "dpo-central") as "deal-room" | "dpo-central" | "ai-sentinel",
    };

    if (!draft.assessmentJson) {
      step = "options";

      // Step 1: Criteria Extraction — stored as-is (criteria carry no
      // guidance fields yet); the next step reads it back and merges.
      const criteriaResult = await runCriteriaExtraction(
        model,
        analysis.rawExtractedText || "",
        classification
      );
      // Open models may null out per-criterion riskLevel; the draft UI and
      // template builder expect a concrete value, so default to "medium".
      for (const category of criteriaResult.categories) {
        for (const criterion of category.criteria) {
          criterion.riskLevel = criterion.riskLevel ?? "medium";
        }
      }

      await prisma.skillDraft.update({
        where: { id: draftId },
        data: {
          skillType: "ASSESSMENT",
          assessmentJson: criteriaResult,
          aiProvider: providerInfo.provider,
          aiModel: providerInfo.model,
        },
      });

      return { done: false, status: "GENERATING", step };
    }

    if (draft.metadataJson) {
      // Final step: skill-specific evals. Additive quality — a failure here
      // falls back to the exporter's skeleton rather than failing the draft.
      step = "evals";
      let evalsJson: unknown = null;
      try {
        const manifest = draft.manifestJson as Record<string, unknown> | null;
        evalsJson = await runEvalsGeneration(model, {
          displayName: draft.displayName || "Assessment",
          isAssessment: true,
          jurisdictions: (manifest?.jurisdictions as string[]) || [],
          language: analysis.jurisdiction === "SPAIN" ? "es" : "en",
          clausesJson: null,
          assessmentJson: draft.assessmentJson,
        });
      } catch (evalError) {
        console.warn(`Eval generation failed for draft ${draftId}; exporter will use the skeleton:`, evalError);
      }
      await prisma.skillDraft.update({
        where: { id: draftId },
        data: { status: "REVIEW", evalsJson: evalsJson ?? undefined },
      });
      return { done: true, status: "REVIEW", step };
    }

    step = "boilerplate";

    const criteriaResult = draft.assessmentJson as unknown as CriteriaExtractionResult;

    // Step 2: Guidance Generation
    const guidanceResult = await runGuidanceGeneration(
      model,
      classification,
      criteriaResult
    );

    // Merge guidance into criteria to build full assessmentJson
    const assessmentJson = {
      assessmentType: criteriaResult.assessmentType,
      scoringMethod: criteriaResult.scoringMethod,
      categories: criteriaResult.categories.map((cat) => ({
        ...cat,
        criteria: cat.criteria.map((criterion) => {
          const guidance = guidanceResult.criteria.find(
            (g) => g.criterionId === criterion.id
          );
          return {
            ...criterion,
            guidance: guidance?.guidance,
            remediation: guidance?.remediation,
            evidenceRequired: guidance?.evidenceRequired,
            scoringOptions: guidance?.scoringOptions,
          };
        }),
      })),
    };

    const guidanceJson = guidanceResult;

    // Derive skill metadata
    const contractTypeSlug = (analysis.contractType || "assessment")
      .toLowerCase()
      .replace(/[_\s]+/g, "-");
    const skillId = `${skillPublishingConfig.idNamespace}.${contractTypeSlug}`;
    const displayName = analysis.contractTypeLabel || analysis.contractType || "Assessment";
    const language = analysis.jurisdiction === "SPAIN" ? "es" : "en";

    // Map destination
    const destinationMap: Record<string, "DEAL_ROOM" | "DPO_CENTRAL" | "AI_SENTINEL"> = {
      "deal-room": "DEAL_ROOM",
      "dpo-central": "DPO_CENTRAL",
      "ai-sentinel": "AI_SENTINEL",
    };

    const jurisdictions = analysis.jurisdiction !== "UNKNOWN"
      ? [analysis.jurisdiction]
      : ["CALIFORNIA"];

    const metadataJson = {
      contractType: (analysis.contractType || "ASSESSMENT").toUpperCase(),
      displayName: { [language]: displayName },
      description: { [language]: analysis.summary || `${displayName} assessment template generated by Clausemaster AI` },
      version: "1.0",
      assessmentType: criteriaResult.assessmentType,
      scoringMethod: criteriaResult.scoringMethod,
      categoryCount: criteriaResult.categories.length,
      criteriaCount: criteriaResult.categories.reduce((sum, cat) => sum + cat.criteria.length, 0),
      languages: [language],
      jurisdictions,
    };

    const manifestJson = {
      skillId,
      name: (analysis.contractType || "ASSESSMENT").toUpperCase(),
      displayName,
      version: "1.0.0",
      jurisdictions,
      languages: [language],
      author: skillPublishingConfig.author,
      license: skillPublishingConfig.defaultLicense,
      templateFamily: (analysis.contractType || "ASSESSMENT").toUpperCase(),
      nativeJurisdiction: jurisdictions[0],
      skillType: "assessment",
    };

    await prisma.skillDraft.update({
      where: { id: draftId },
      data: {
        skillType: "ASSESSMENT",
        destination: analysis.suggestedDestination
          ? destinationMap[analysis.suggestedDestination] || null
          : null,
        skillId,
        contractType: (analysis.contractType || "ASSESSMENT").toUpperCase(),
        displayName,
        assessmentJson,
        guidanceJson,
        metadataJson,
        manifestJson,
        processingTimeMs: Date.now() - draft.createdAt.getTime(),
      },
    });

    return { done: false, status: "GENERATING", step };
  } catch (error) {
    console.error(`Assessment generation step "${step}" failed for draft ${draftId}:`, error);
    const message = error instanceof Error ? error.message : "Assessment skill generation failed";
    await prisma.skillDraft.update({
      where: { id: draftId },
      data: { status: "FAILED", errorMessage: message },
    });
    return { done: true, status: "FAILED", step, error: message };
  }
}

async function runCriteriaExtraction(
  model: Parameters<typeof generateObject>[0]["model"],
  text: string,
  classification: Parameters<typeof buildCriteriaExtractionPrompt>[1]
): Promise<CriteriaExtractionResult> {
  const prompt = buildCriteriaExtractionPrompt(text, classification);
  const result = await generateObject({
    model,
    schema: criteriaExtractionSchema,
    prompt,
    maxTokens: 32768,
  });
  return result.object;
}

async function runGuidanceGeneration(
  model: Parameters<typeof generateObject>[0]["model"],
  classification: Parameters<typeof buildGuidanceGenerationPrompt>[0],
  criteria: CriteriaExtractionResult
): Promise<GuidanceGenerationResult> {
  const prompt = buildGuidanceGenerationPrompt(classification, criteria);
  const result = await generateObject({
    model,
    schema: guidanceGenerationSchema,
    prompt,
    maxTokens: 32768,
  });
  return result.object;
}
