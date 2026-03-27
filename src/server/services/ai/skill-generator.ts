import { generateObject } from "ai";
import { getAIModel, getProviderInfo } from "./provider";
import type { AIConfig } from "../resolve-ai-config";
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
  aiConfig: AIConfig
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
    const model = getAIModel(aiConfig);
    const providerInfo = getProviderInfo(aiConfig);

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

    const jurisdictions = analysis.jurisdiction !== "UNKNOWN"
      ? [analysis.jurisdiction]
      : ["CALIFORNIA"];

    // Build metadata
    const metadataJson = {
      contractType: (analysis.contractType || "CONTRACT").toUpperCase(),
      displayName: { [language]: displayName },
      description: { [language]: analysis.summary || `${displayName} template generated by Clausemaster AI` },
      category: { [language]: inferCategory(analysis.contractType || "CONTRACT") },
      version: "1.0",
      clauseCount: clauseTitles.length,
      languages: [language],
      jurisdictions,
      soloModeSupported: isSoloParty,
      soloModeDefault: isSoloParty,
      soloModeOnly: isSoloParty,
    };

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
        boilerplateJson: buildBoilerplateJson(boilerplateResult, language),
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
    languages: [language],
    clauses: optionResult.clauses.map((clause) => ({
      id: clause.id,
      title: { [language]: clause.title },
      category: { [language]: clause.category },
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
        pros: {
          partyA: { [language]: opt.prosPartyA },
          partyB: { [language]: opt.prosPartyB },
        },
        cons: {
          partyA: { [language]: opt.consPartyA },
          partyB: { [language]: opt.consPartyB },
        },
        legalText: { [language]: opt.legalText },
        bias: {
          partyA: opt.biasPartyA,
          partyB: opt.biasPartyB,
        },
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
    languages: [language],
    partyMode: "solo",
    clauses: soloResult.clauses.map((clause) => ({
      id: clause.id,
      title: { [language]: clause.title },
      category: { [language]: clause.category },
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
        pros: {
          partyA: { [language]: opt.advantages },
          partyB: { [language]: [] as string[] },
        },
        cons: {
          partyA: { [language]: opt.disadvantages },
          partyB: { [language]: [] as string[] },
        },
        legalText: { [language]: opt.legalText },
        bias: {
          partyA: 0,
          partyB: 0,
        },
      })),
    })),
  };
}

const CATEGORY_MAP: Record<string, string> = {
  NDA: "Confidentiality",
  FOUNDERS: "Corporate",
  FOUNDERS_AGREEMENT: "Corporate",
  SAFE: "Investment",
  SAFE_AGREEMENT: "Investment",
  SHAREHOLDERS: "Corporate",
  SHAREHOLDERS_AGREEMENT: "Corporate",
  PACTO_SOCIOS: "Corporate",
  CONSULTING: "Services",
  CONSULTING_AGREEMENT: "Services",
  EMPLOYMENT: "Employment",
  EMPLOYMENT_AGREEMENT: "Employment",
  CONTRATO_LABORAL: "Employment",
  CONTRATO_SERVICIOS: "Services",
  IP_ASSIGNMENT: "IP",
  CESION_PI: "IP",
  CONVERTIBLE_NOTE: "Investment",
  TERM_SHEET: "Investment",
  SEED_INVESTMENT: "Investment",
  DATA_LICENSING: "Data",
  DPA: "Privacy",
  PRIVACY_NOTICE: "Privacy",
  SAAS: "Technology",
  MSA: "Services",
  LEASE: "Real Estate",
  SPA: "Corporate",
};

function inferCategory(contractType: string): string {
  return CATEGORY_MAP[contractType.toUpperCase()] || "General";
}

function buildBoilerplateJson(result: BoilerplateGenerationResult, language: string) {
  return {
    contractTitle: { [language]: result.contractTitle },
    preamble: { [language]: result.preamble },
    background: { [language]: result.background },
    definitions: result.definitions.map((d) => ({
      term: { [language]: d.term },
      definition: { [language]: d.definition },
    })),
    standardClauses: result.standardClauses.map((c) => ({
      title: { [language]: c.title },
      text: { [language]: c.text },
    })),
    generalProvisions: result.generalProvisions.map((p) => ({
      title: { [language]: p.title },
      text: { [language]: p.text },
    })),
    jurisdictionProvisions: result.jurisdictionProvisions
      ? Object.fromEntries(
          Object.entries(result.jurisdictionProvisions).map(([key, val]) => [
            key,
            { title: { [language]: val.title }, text: { [language]: val.text } },
          ])
        )
      : undefined,
    signatureBlock: { [language]: result.signatureBlock },
    partyLabels: {
      partyA: { [language]: result.partyLabels.partyA },
      partyB: { [language]: result.partyLabels.partyB },
    },
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
    maxTokens: 16384,
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
    maxTokens: 16384,
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
    maxTokens: 16384,
  });
  return result.object;
}
