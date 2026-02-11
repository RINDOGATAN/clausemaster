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

// Step 4: Option generation schema (for Deal Room skill generation)
export const optionGenerationSchema = z.object({
  clauses: z.array(z.object({
    id: z.string().describe("Slug identifier for the clause, e.g. 'data-retention' or 'equity-split'"),
    title: z.string().describe("Human-readable clause title"),
    category: z.string().describe("Category grouping, e.g. Equity, Term, Liability, IP, Confidentiality"),
    order: z.number().describe("Display order (1-based)"),
    plainDescription: z.string().describe("Plain language description of what this clause covers and why it matters"),
    legalContext: z.string().optional().describe("Legal/regulatory context for this clause"),
    isRequired: z.boolean().describe("Whether this clause is mandatory for a valid contract"),
    options: z.array(z.object({
      id: z.string().describe("Option slug, e.g. 'narrow', 'standard', 'broad'"),
      code: z.string().describe("Short code for the option"),
      label: z.string().describe("Human-readable option label"),
      order: z.number().describe("Display order within clause (1-based)"),
      plainDescription: z.string().describe("Plain language explanation of this option"),
      prosPartyA: z.array(z.string()).describe("2-4 advantages for Party A"),
      consPartyA: z.array(z.string()).describe("2-4 disadvantages for Party A"),
      prosPartyB: z.array(z.string()).describe("2-4 advantages for Party B"),
      consPartyB: z.array(z.string()).describe("2-4 disadvantages for Party B"),
      legalText: z.string().describe("Full legal text for this option as it would appear in the contract"),
      biasPartyA: z.number().min(-1).max(1).describe("Bias score toward Party A (-1 to 1, where 1 = strongly favors A, -1 = strongly against A)"),
      biasPartyB: z.number().min(-1).max(1).describe("Bias score toward Party B (-1 to 1, where 1 = strongly favors B, -1 = strongly against B)"),
    })).min(3).describe("3-5 negotiation options from Party-A-favorable to Party-B-favorable"),
  })),
});

export type OptionGenerationResult = z.infer<typeof optionGenerationSchema>;

// Step 5: Boilerplate generation schema (for Deal Room skill generation)
export const boilerplateGenerationSchema = z.object({
  contractTitle: z.string().describe("Contract title in ALL CAPS, e.g. 'DATA PROCESSING AGREEMENT'"),
  preamble: z.string().describe("Opening paragraph with placeholders: {effectiveDate}, {partyAName}, {partyBName}, {partyAAddress}, {partyBAddress}"),
  background: z.string().describe("WHEREAS/recitals section establishing context"),
  definitions: z.array(z.object({
    term: z.string().describe("Defined term"),
    definition: z.string().describe("Definition text"),
  })).describe("Key defined terms used throughout the contract"),
  standardClauses: z.array(z.object({
    title: z.string().describe("Clause title"),
    text: z.string().describe("Non-negotiable clause text"),
  })).describe("Standard clauses that are not subject to negotiation"),
  generalProvisions: z.array(z.object({
    title: z.string().describe("Provision title"),
    text: z.string().describe("General provision text"),
  })).describe("General/boilerplate provisions like entire agreement, amendments, notices"),
  jurisdictionProvisions: z.record(z.object({
    title: z.string().describe("Jurisdiction-specific provision title"),
    text: z.string().describe("Jurisdiction-specific provision text"),
  })).optional().describe("Jurisdiction-specific provisions keyed by jurisdiction code (e.g. CALIFORNIA, ENGLAND_WALES, SPAIN)"),
  signatureBlock: z.string().describe("Signature block template with {partyASignatureBlock} and {partyBSignatureBlock} placeholders"),
  partyLabels: z.object({
    partyA: z.string().describe("Label for Party A, e.g. 'Company', 'Employer', 'Founder A'"),
    partyB: z.string().describe("Label for Party B, e.g. 'Investor', 'Employee', 'Founder B'"),
  }),
});

export type BoilerplateGenerationResult = z.infer<typeof boilerplateGenerationSchema>;
