import { z } from "zod";

// Step 1: Classification schema
export const classificationSchema = z.object({
  contractType: z.string().describe("Contract type code (e.g., NDA, FOUNDERS, SAFE, EMPLOYMENT, LEASE, SPA, MSA, SAAS, DPA, CONSULTING)"),
  contractTypeLabel: z.string().describe("Human-readable contract type name"),
  jurisdiction: z.enum(["CALIFORNIA", "ENGLAND_WALES", "SPAIN", "UNKNOWN"]).describe("Detected jurisdiction based on legal references, governing law clauses, or party locations"),
  jurisdictionNotes: z.string().optional().describe("Notes about jurisdiction detection reasoning"),
  partyNames: z.array(z.string()).describe("Names of the parties to the contract"),
  effectiveDate: z.string().optional().describe("Effective date of the contract if found"),
  summary: z.string().describe("2-3 sentence summary of the contract's purpose and key terms"),
});

export type ClassificationResult = z.infer<typeof classificationSchema>;

// Step 2: Clause extraction schema
export const clauseExtractionSchema = z.object({
  clauses: z.array(z.object({
    title: z.string().describe("Title or heading of the clause"),
    category: z.string().optional().describe("Category (e.g., Equity, Term, Liability, IP, Confidentiality, Termination)"),
    originalText: z.string().describe("The original text of the clause from the contract"),
    summary: z.string().describe("Plain language summary of what this clause does"),
    legalSignificance: z.string().optional().describe("Why this clause matters legally"),
    skillClauseMatch: z.string().optional().describe("Matching clause ID from legalskills if applicable"),
    biasAssessment: z.enum(["neutral", "favors-party-a", "favors-party-b"]).describe("Whether the clause favors one party over the other"),
  })),
});

export type ClauseExtractionResult = z.infer<typeof clauseExtractionSchema>;

// Step 3: Issue flagging schema
export const issueFlaggingSchema = z.object({
  issues: z.array(z.object({
    type: z.enum(["MISSING_CLAUSE", "UNUSUAL_TERM", "JURISDICTION_CONCERN", "AMBIGUITY", "IMBALANCE", "COMPLIANCE_RISK"]),
    severity: z.enum(["INFO", "WARNING", "CRITICAL"]),
    title: z.string().describe("Short title for the issue"),
    description: z.string().describe("Detailed description of the issue"),
    recommendation: z.string().optional().describe("Recommended action to address the issue"),
    relatedClauseTitle: z.string().optional().describe("Title of the related clause, if any"),
    jurisdictionNote: z.string().optional().describe("Jurisdiction-specific note about this issue"),
  })),
});

export type IssueFlaggingResult = z.infer<typeof issueFlaggingSchema>;
