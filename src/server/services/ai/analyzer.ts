import { generateObject } from "ai";
import { getAIModel, getProviderInfo } from "./provider";
import { classificationSchema, clauseExtractionSchema, issueFlaggingSchema } from "./schemas";
import type { ClassificationResult, ClauseExtractionResult, IssueFlaggingResult } from "./schemas";
import { buildClassificationPrompt, buildClauseExtractionPrompt, buildIssueFlaggingPrompt } from "./prompts";
import { loadSkillContext } from "../knowledge/loader";
import { extractText } from "../document/parser";
import type { AIConfig } from "../resolve-ai-config";
import prisma from "@/lib/prisma";

export interface AnalysisStepResult {
  done: boolean;
  status: string;
  step: "extract" | "classify" | "clauses" | "issues" | null;
  error?: string;
}

/**
 * Run exactly ONE step of the analysis pipeline and persist its result. The
 * client calls this repeatedly until `done` — each call fits inside Vercel
 * Hobby's 10s function cap, unlike the old single-invocation pipeline.
 *
 * Step dispatch is derived from persisted state, so an interrupted pipeline
 * resumes wherever it left off:
 *   UPLOADED/EXTRACTING          -> extract text, create Analysis
 *   no contractType on Analysis  -> classification
 *   no AnalyzedClause rows       -> clause extraction (0 clauses = failure)
 *   otherwise                    -> issue flagging, then COMPLETED
 */
export async function runAnalysisStep(
  documentId: string,
  aiConfig: AIConfig
): Promise<AnalysisStepResult> {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { id: true, status: true, fileType: true },
  });

  if (!document) {
    throw new Error("Document not found");
  }

  if (document.status === "COMPLETED" || document.status === "FAILED") {
    return { done: true, status: document.status, step: null };
  }

  const analysis = await prisma.analysis.findUnique({
    where: { documentId },
    include: { _count: { select: { clauses: true } } },
  });

  let step: AnalysisStepResult["step"] = null;
  try {
    if (!analysis || document.status === "UPLOADED" || document.status === "EXTRACTING") {
      step = "extract";
      await runExtractStep(documentId, document.fileType);
      return { done: false, status: "ANALYZING", step };
    }

    const model = getAIModel(aiConfig);

    if (!analysis.contractType) {
      step = "classify";
      await runClassifyStep(analysis.id, analysis.rawExtractedText || "", model, aiConfig);
      return { done: false, status: "ANALYZING", step };
    }

    const classification = rebuildClassification(analysis);

    if (analysis._count.clauses === 0) {
      step = "clauses";
      await runClausesStep(analysis.id, analysis.rawExtractedText || "", classification, model);
      return { done: false, status: "ANALYZING", step };
    }

    step = "issues";
    await runIssuesStep(documentId, analysis.id, analysis.createdAt, classification, model);
    return { done: true, status: "COMPLETED", step };
  } catch (error) {
    console.error(`Analysis step "${step}" failed for document ${documentId}:`, error);
    const message = error instanceof Error ? error.message : "Analysis failed";
    await prisma.document.update({
      where: { id: documentId },
      data: { status: "FAILED", errorMessage: message },
    });
    return { done: true, status: "FAILED", step, error: message };
  }
}

async function runExtractStep(documentId: string, fileType: string): Promise<void> {
  await prisma.document.update({
    where: { id: documentId },
    data: { status: "EXTRACTING" },
  });

  const { fileData } = (await prisma.document.findUnique({
    where: { id: documentId },
    select: { fileData: true },
  })) || {};

  if (!fileData) {
    throw new Error("Document file data not found");
  }

  const extractedText = await extractText(Buffer.from(fileData), fileType);

  if (!extractedText || extractedText.trim().length === 0) {
    throw new Error("Failed to extract text from document");
  }

  // Idempotent restart: a half-finished prior run may have left an analysis
  await prisma.analysis.deleteMany({ where: { documentId } });
  await prisma.analysis.create({
    data: { documentId, rawExtractedText: extractedText },
  });

  await prisma.document.update({
    where: { id: documentId },
    data: { status: "ANALYZING", errorMessage: null },
  });
}

async function runClassifyStep(
  analysisId: string,
  extractedText: string,
  model: Parameters<typeof generateObject>[0]["model"],
  aiConfig: AIConfig
): Promise<void> {
  const classification = await runClassification(model, extractedText);
  const providerInfo = getProviderInfo(aiConfig);

  await prisma.analysis.update({
    where: { id: analysisId },
    data: {
      contractType: classification.contractType,
      contractTypeLabel: classification.contractTypeLabel,
      jurisdiction: classification.jurisdiction,
      jurisdictionNotes: classification.jurisdictionNotes ?? null,
      summary: classification.summary,
      partyNames: classification.partyNames ?? [],
      effectiveDate: classification.effectiveDate ?? null,
      documentCategory: classification.documentCategory,
      partyMode: classification.partyMode,
      suggestedDestination: classification.suggestedDestination,
      aiProvider: providerInfo.provider,
      aiModel: providerInfo.model,
    },
  });
}

async function runClausesStep(
  analysisId: string,
  extractedText: string,
  classification: ClassificationResult,
  model: Parameters<typeof generateObject>[0]["model"]
): Promise<void> {
  const skillContext = await loadSkillContext(classification.contractType);
  const clauseResult = await runClauseExtraction(
    model,
    extractedText,
    classification,
    skillContext?.skillMd || null
  );

  if (clauseResult.clauses.length === 0) {
    throw new Error("No clauses could be extracted from the document");
  }

  const biasMap: Record<string, "NEUTRAL" | "FAVORS_PARTY_A" | "FAVORS_PARTY_B"> = {
    "neutral": "NEUTRAL",
    "favors-party-a": "FAVORS_PARTY_A",
    "favors-party-b": "FAVORS_PARTY_B",
  };

  // Idempotent restart: clear any clauses from a half-finished prior run
  await prisma.analyzedClause.deleteMany({ where: { analysisId } });
  await prisma.analyzedClause.createMany({
    data: clauseResult.clauses.map((clause, i) => ({
      analysisId,
      order: i + 1,
      title: clause.title,
      category: clause.category,
      originalText: clause.originalText,
      summary: clause.summary,
      legalSignificance: clause.legalSignificance,
      skillClauseMatch: clause.skillClauseMatch,
      biasAssessment: biasMap[clause.biasAssessment ?? "neutral"] || "NEUTRAL",
    })),
  });
}

async function runIssuesStep(
  documentId: string,
  analysisId: string,
  analysisCreatedAt: Date,
  classification: ClassificationResult,
  model: Parameters<typeof generateObject>[0]["model"]
): Promise<void> {
  const clauses = await prisma.analyzedClause.findMany({
    where: { analysisId },
    orderBy: { order: "asc" },
    select: { id: true, title: true },
  });
  const clauseMap = new Map(clauses.map((c) => [c.title, c.id]));

  const skillContext = await loadSkillContext(classification.contractType);
  const issueResult = await runIssueFlagging(
    model,
    classification,
    clauses.map((c) => c.title),
    skillContext?.clauseTitles || null,
    classification.jurisdiction
  );

  // Idempotent restart: clear any issues from a half-finished prior run
  await prisma.issue.deleteMany({ where: { analysisId } });
  for (const issue of issueResult.issues) {
    await prisma.issue.create({
      data: {
        analysisId,
        clauseId: issue.relatedClauseTitle
          ? clauseMap.get(issue.relatedClauseTitle) || null
          : null,
        type: issue.type,
        severity: issue.severity,
        title: issue.title,
        description: issue.description,
        recommendation: issue.recommendation,
        jurisdictionNote: issue.jurisdictionNote,
      },
    });
  }

  await prisma.analysis.update({
    where: { id: analysisId },
    data: { processingTimeMs: Date.now() - analysisCreatedAt.getTime() },
  });

  await prisma.document.update({
    where: { id: documentId },
    data: { status: "COMPLETED" },
  });
}

function rebuildClassification(analysis: {
  contractType: string | null;
  contractTypeLabel: string | null;
  jurisdiction: string;
  jurisdictionNotes: string | null;
  summary: string | null;
  partyNames: string[];
  effectiveDate: string | null;
  documentCategory: string | null;
  partyMode: string | null;
  suggestedDestination: string | null;
}): ClassificationResult {
  return {
    contractType: analysis.contractType || "OTHER",
    contractTypeLabel: analysis.contractTypeLabel || analysis.contractType || "Contract",
    jurisdiction: analysis.jurisdiction as ClassificationResult["jurisdiction"],
    jurisdictionNotes: analysis.jurisdictionNotes || undefined,
    summary: analysis.summary || "",
    partyNames: analysis.partyNames,
    effectiveDate: analysis.effectiveDate || undefined,
    documentCategory: (analysis.documentCategory || "contract") as ClassificationResult["documentCategory"],
    partyMode: (analysis.partyMode || undefined) as ClassificationResult["partyMode"],
    suggestedDestination: (analysis.suggestedDestination || "deal-room") as ClassificationResult["suggestedDestination"],
  };
}

async function runClassification(
  model: Parameters<typeof generateObject>[0]["model"],
  text: string
): Promise<ClassificationResult> {
  const prompt = buildClassificationPrompt(text);
  const result = await generateObject({
    model,
    schema: classificationSchema,
    prompt,
  });
  return result.object;
}

async function runClauseExtraction(
  model: Parameters<typeof generateObject>[0]["model"],
  text: string,
  classification: ClassificationResult,
  skillContext: string | null
): Promise<ClauseExtractionResult> {
  const prompt = buildClauseExtractionPrompt(text, classification, skillContext);
  const result = await generateObject({
    model,
    schema: clauseExtractionSchema,
    prompt,
    maxTokens: 16384,
  });
  return result.object;
}

async function runIssueFlagging(
  model: Parameters<typeof generateObject>[0]["model"],
  classification: ClassificationResult,
  clauseTitles: string[],
  expectedClauses: string[] | null,
  jurisdiction: string
): Promise<IssueFlaggingResult> {
  const prompt = buildIssueFlaggingPrompt(
    classification,
    clauseTitles,
    expectedClauses,
    jurisdiction
  );
  const result = await generateObject({
    model,
    schema: issueFlaggingSchema,
    prompt,
    maxTokens: 8192,
  });
  return result.object;
}
