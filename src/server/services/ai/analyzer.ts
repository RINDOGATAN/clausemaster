import { generateObject } from "ai";
import { getAIModel, getProviderInfo } from "./provider";
import { classificationSchema, clauseExtractionSchema, issueFlaggingSchema } from "./schemas";
import type { ClassificationResult, ClauseExtractionResult, IssueFlaggingResult } from "./schemas";
import { buildClassificationPrompt, buildClauseExtractionPrompt, buildIssueFlaggingPrompt } from "./prompts";
import { loadSkillContext } from "../knowledge/loader";
import { extractText } from "../document/parser";
import prisma from "@/lib/prisma";

export async function analyzeDocument(
  documentId: string,
  options?: { anthropicApiKey?: string }
): Promise<void> {
  const startTime = Date.now();

  try {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { id: true, fileName: true, fileType: true, fileData: true },
    });

    if (!document) {
      throw new Error("Document not found");
    }

    if (!document.fileData) {
      throw new Error("Document file data not found");
    }

    // Step 0: Extract text
    await prisma.document.update({
      where: { id: documentId },
      data: { status: "EXTRACTING" },
    });

    const extractedText = await extractText(Buffer.from(document.fileData), document.fileType);

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error("Failed to extract text from document");
    }

    await prisma.document.update({
      where: { id: documentId },
      data: { status: "ANALYZING" },
    });

    // Create analysis record with raw text
    const analysis = await prisma.analysis.create({
      data: {
        documentId,
        rawExtractedText: extractedText,
      },
    });

    const model = getAIModel(options);
    const providerInfo = getProviderInfo();

    // Step 1: Classification
    const classification = await runClassification(model, extractedText);

    // Load skill context if available
    const skillContext = await loadSkillContext(classification.contractType);
    const skillMdContent = skillContext?.skillMd || null;
    const expectedClauses = skillContext?.clauseTitles || null;

    await prisma.analysis.update({
      where: { id: analysis.id },
      data: {
        contractType: classification.contractType,
        contractTypeLabel: classification.contractTypeLabel,
        jurisdiction: classification.jurisdiction,
        jurisdictionNotes: classification.jurisdictionNotes,
        summary: classification.summary,
        partyNames: classification.partyNames,
        effectiveDate: classification.effectiveDate,
        documentCategory: classification.documentCategory,
        partyMode: classification.partyMode,
        suggestedDestination: classification.suggestedDestination,
        aiProvider: providerInfo.provider,
        aiModel: providerInfo.model,
      },
    });

    // Step 2: Clause extraction
    const clauseResult = await runClauseExtraction(
      model,
      extractedText,
      classification,
      skillMdContent
    );

    // Save clauses to database
    const clauseMap = new Map<string, string>();
    for (let i = 0; i < clauseResult.clauses.length; i++) {
      const clause = clauseResult.clauses[i];
      const biasMap: Record<string, "NEUTRAL" | "FAVORS_PARTY_A" | "FAVORS_PARTY_B"> = {
        "neutral": "NEUTRAL",
        "favors-party-a": "FAVORS_PARTY_A",
        "favors-party-b": "FAVORS_PARTY_B",
      };

      const created = await prisma.analyzedClause.create({
        data: {
          analysisId: analysis.id,
          order: i + 1,
          title: clause.title,
          category: clause.category,
          originalText: clause.originalText,
          summary: clause.summary,
          legalSignificance: clause.legalSignificance,
          skillClauseMatch: clause.skillClauseMatch,
          biasAssessment: biasMap[clause.biasAssessment] || "NEUTRAL",
        },
      });
      clauseMap.set(clause.title, created.id);
    }

    // Step 3: Issue flagging
    const clauseTitles = clauseResult.clauses.map((c) => c.title);
    const issueResult = await runIssueFlagging(
      model,
      classification,
      clauseTitles,
      expectedClauses,
      classification.jurisdiction
    );

    // Save issues to database
    for (const issue of issueResult.issues) {
      const clauseId = issue.relatedClauseTitle
        ? clauseMap.get(issue.relatedClauseTitle) || null
        : null;

      await prisma.issue.create({
        data: {
          analysisId: analysis.id,
          clauseId,
          type: issue.type,
          severity: issue.severity,
          title: issue.title,
          description: issue.description,
          recommendation: issue.recommendation,
          jurisdictionNote: issue.jurisdictionNote,
        },
      });
    }

    // Mark as completed
    const processingTimeMs = Date.now() - startTime;
    await prisma.analysis.update({
      where: { id: analysis.id },
      data: { processingTimeMs },
    });

    await prisma.document.update({
      where: { id: documentId },
      data: { status: "COMPLETED" },
    });
  } catch (error) {
    console.error(`Analysis failed for document ${documentId}:`, error);
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Analysis failed",
      },
    });
  }
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
  });
  return result.object;
}
