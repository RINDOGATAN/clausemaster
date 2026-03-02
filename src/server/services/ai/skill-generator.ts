import { generateObject } from "ai";
import { getAIModel, getProviderInfo } from "./provider";
import {
  optionGenerationSchema,
  soloOptionGenerationSchema,
  boilerplateGenerationSchema,
} from "./schemas";
import type {
  OptionGenerationResult,
  SoloOptionGenerationResult,
  BoilerplateGenerationResult,
} from "./schemas";
import {
  buildOptionGenerationPrompt,
  buildSoloOptionGenerationPrompt,
  buildBoilerplateGenerationPrompt,
} from "./prompts";
import prisma from "@/lib/prisma";

export async function generateSkillDraft(
  analysisId: string,
  options?: { anthropicApiKey?: string }
): Promise<string> {
  const startTime = Date.now();

  // Load analysis with clauses and issues
  const analysis = await prisma.analysis.findUnique({
    where: { id: analysisId },
    include: {
      document: true,
      clauses: {
        orderBy: { order: "asc" },
      },
      issues: true,
    },
  });

  if (!analysis) {
    throw new Error("Analysis not found");
  }

  if (!analysis.document || analysis.document.status !== "COMPLETED") {
    throw new Error("Analysis must be completed before generating a skill");
  }

  if (analysis.clauses.length === 0) {
    throw new Error("Analysis has no extracted clauses");
  }

  // Create SkillDraft record
  const draft = await prisma.skillDraft.create({
    data: {
      analysisId,
      status: "GENERATING",
    },
  });

  try {
    const model = getAIModel(options);
    const providerInfo = getProviderInfo();

    // Build classification object from analysis fields
    const classification = {
      contractType: analysis.contractType || "OTHER",
      contractTypeLabel: analysis.contractTypeLabel || analysis.contractType || "Contract",
      jurisdiction: analysis.jurisdiction as "CALIFORNIA" | "ENGLAND_WALES" | "SPAIN" | "UNKNOWN",
      jurisdictionNotes: analysis.jurisdictionNotes || undefined,
      partyNames: analysis.partyNames,
      effectiveDate: analysis.effectiveDate || undefined,
      summary: analysis.summary || "",
      documentCategory: (analysis.documentCategory || "contract") as "contract" | "assessment",
      partyMode: analysis.partyMode as "two-party" | "solo" | undefined,
      suggestedDestination: (analysis.suggestedDestination || "deal-room") as "deal-room" | "dpo-central" | "ai-sentinel",
    };

    // Build clauses in the format expected by prompts
    const extractedClauses = analysis.clauses.map((c) => ({
      title: c.title,
      category: c.category || undefined,
      originalText: c.originalText,
      summary: c.summary || "",
      legalSignificance: c.legalSignificance || undefined,
      skillClauseMatch: c.skillClauseMatch || undefined,
      biasAssessment: c.biasAssessment === "FAVORS_PARTY_A"
        ? "favors-party-a" as const
        : c.biasAssessment === "FAVORS_PARTY_B"
        ? "favors-party-b" as const
        : "neutral" as const,
    }));

    const isSoloParty = analysis.partyMode === "solo";

    // Step 4: Option Generation (branching on party mode)
    let clausesJson: ReturnType<typeof buildClausesJson> | ReturnType<typeof buildSoloClausesJson>;
    let clauseTitles: string[];

    if (isSoloParty) {
      const soloResult = await runSoloOptionGeneration(
        model,
        analysis.rawExtractedText || "",
        classification,
        extractedClauses
      );
      clauseTitles = soloResult.clauses.map((c) => c.title);

      // Detect language from jurisdiction
      const language = analysis.jurisdiction === "SPAIN" ? "es" : "en";
      const displayName = analysis.contractTypeLabel || analysis.contractType || "Document";
      clausesJson = buildSoloClausesJson(
        analysis.contractType || "CONTRACT",
        displayName,
        soloResult,
        language
      );
    } else {
      const optionResult = await runOptionGeneration(
        model,
        analysis.rawExtractedText || "",
        classification,
        extractedClauses
      );
      clauseTitles = optionResult.clauses.map((c) => c.title);

      // Detect language from jurisdiction
      const language = analysis.jurisdiction === "SPAIN" ? "es" : "en";
      const displayName = analysis.contractTypeLabel || analysis.contractType || "Contract";
      clausesJson = buildClausesJson(
        analysis.contractType || "CONTRACT",
        displayName,
        optionResult,
        language
      );
    }

    // Step 5: Boilerplate Generation
    const boilerplateResult = await runBoilerplateGeneration(
      model,
      classification,
      clauseTitles,
      { soloParty: isSoloParty }
    );

    // Derive skill metadata
    const contractTypeSlug = (analysis.contractType || "contract")
      .toLowerCase()
      .replace(/[_\s]+/g, "-");
    const skillId = `com.nel.skills.${contractTypeSlug}`;
    const displayName = analysis.contractTypeLabel || analysis.contractType || "Contract";

    // Detect language from jurisdiction
    const language = analysis.jurisdiction === "SPAIN" ? "es" : "en";

    // Build metadata
    const metadataJson = {
      contractType: (analysis.contractType || "CONTRACT").toUpperCase(),
      displayName,
      description: analysis.summary || `${displayName} template generated by Clausemaster AI`,
      version: "1.0",
      clauseCount: clauseTitles.length,
    };

    // Build manifest
    const jurisdictions = analysis.jurisdiction !== "UNKNOWN"
      ? [analysis.jurisdiction]
      : ["CALIFORNIA"];

    // Map destination string to enum value
    const destinationMap: Record<string, "DEAL_ROOM" | "DPO_CENTRAL" | "AI_SENTINEL"> = {
      "deal-room": "DEAL_ROOM",
      "dpo-central": "DPO_CENTRAL",
      "ai-sentinel": "AI_SENTINEL",
    };

    const manifestJson = {
      skillId,
      name: (analysis.contractType || "CONTRACT").toUpperCase(),
      displayName,
      version: "1.0.0",
      jurisdictions,
      languages: [language],
      author: "Clausemaster AI",
      license: "proprietary",
      templateFamily: (analysis.contractType || "CONTRACT").toUpperCase(),
      nativeJurisdiction: jurisdictions[0],
    };

    const processingTimeMs = Date.now() - startTime;

    // Update the draft with all generated data
    await prisma.skillDraft.update({
      where: { id: draft.id },
      data: {
        status: "REVIEW",
        skillType: "CONTRACT",
        partyMode: isSoloParty ? "SOLO" : "TWO_PARTY",
        destination: analysis.suggestedDestination
          ? destinationMap[analysis.suggestedDestination] || null
          : null,
        skillId,
        contractType: (analysis.contractType || "CONTRACT").toUpperCase(),
        displayName,
        clausesJson,
        boilerplateJson: boilerplateResult,
        metadataJson,
        manifestJson,
        aiProvider: providerInfo.provider,
        aiModel: providerInfo.model,
        processingTimeMs,
      },
    });

    return draft.id;
  } catch (error) {
    console.error(`Skill generation failed for analysis ${analysisId}:`, error);
    await prisma.skillDraft.update({
      where: { id: draft.id },
      data: {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Skill generation failed",
      },
    });
    throw error;
  }
}

function buildClausesJson(
  contractType: string,
  displayName: string,
  optionResult: OptionGenerationResult,
  language: string
) {
  return {
    contractType: contractType.toUpperCase(),
    displayName: { [language]: displayName },
    description: { [language]: `${displayName} template` },
    version: "1.0",
    clauses: optionResult.clauses.map((clause) => ({
      id: clause.id,
      title: { [language]: clause.title },
      category: clause.category,
      order: clause.order,
      plainDescription: { [language]: clause.plainDescription },
      legalContext: clause.legalContext
        ? { [language]: clause.legalContext }
        : undefined,
      isRequired: clause.isRequired,
      options: clause.options.map((opt) => ({
        id: opt.id,
        code: opt.code,
        label: { [language]: opt.label },
        order: opt.order,
        plainDescription: { [language]: opt.plainDescription },
        prosPartyA: { [language]: opt.prosPartyA },
        consPartyA: { [language]: opt.consPartyA },
        prosPartyB: { [language]: opt.prosPartyB },
        consPartyB: { [language]: opt.consPartyB },
        legalText: { [language]: opt.legalText },
        biasPartyA: opt.biasPartyA,
        biasPartyB: opt.biasPartyB,
      })),
    })),
  };
}

function buildSoloClausesJson(
  contractType: string,
  displayName: string,
  soloResult: SoloOptionGenerationResult,
  language: string
) {
  return {
    contractType: contractType.toUpperCase(),
    displayName: { [language]: displayName },
    description: { [language]: `${displayName} template` },
    version: "1.0",
    partyMode: "solo",
    clauses: soloResult.clauses.map((clause) => ({
      id: clause.id,
      title: { [language]: clause.title },
      category: clause.category,
      order: clause.order,
      plainDescription: { [language]: clause.plainDescription },
      legalContext: clause.legalContext
        ? { [language]: clause.legalContext }
        : undefined,
      isRequired: clause.isRequired,
      options: clause.options.map((opt) => ({
        id: opt.id,
        code: opt.code,
        label: { [language]: opt.label },
        order: opt.order,
        plainDescription: { [language]: opt.plainDescription },
        advantages: { [language]: opt.advantages },
        disadvantages: { [language]: opt.disadvantages },
        legalText: { [language]: opt.legalText },
      })),
    })),
  };
}

async function runSoloOptionGeneration(
  model: Parameters<typeof generateObject>[0]["model"],
  contractText: string,
  classification: Parameters<typeof buildSoloOptionGenerationPrompt>[1],
  clauses: Parameters<typeof buildSoloOptionGenerationPrompt>[2]
): Promise<SoloOptionGenerationResult> {
  const prompt = buildSoloOptionGenerationPrompt(contractText, classification, clauses);
  const result = await generateObject({
    model,
    schema: soloOptionGenerationSchema,
    prompt,
  });
  return result.object;
}

async function runOptionGeneration(
  model: Parameters<typeof generateObject>[0]["model"],
  contractText: string,
  classification: Parameters<typeof buildOptionGenerationPrompt>[1],
  clauses: Parameters<typeof buildOptionGenerationPrompt>[2]
): Promise<OptionGenerationResult> {
  const prompt = buildOptionGenerationPrompt(contractText, classification, clauses);
  const result = await generateObject({
    model,
    schema: optionGenerationSchema,
    prompt,
  });
  return result.object;
}

async function runBoilerplateGeneration(
  model: Parameters<typeof generateObject>[0]["model"],
  classification: Parameters<typeof buildBoilerplateGenerationPrompt>[0],
  clauseTitles: string[],
  options?: { soloParty?: boolean }
): Promise<BoilerplateGenerationResult> {
  const prompt = buildBoilerplateGenerationPrompt(classification, clauseTitles, options);
  const result = await generateObject({
    model,
    schema: boilerplateGenerationSchema,
    prompt,
  });
  return result.object;
}
