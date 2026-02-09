import type { ClassificationResult } from "./schemas";

export function buildClassificationPrompt(text: string): string {
  // Use first ~8K tokens worth of text for classification
  const truncated = text.slice(0, 32000);

  return `You are a legal contract analysis expert. Analyze the following contract text and classify it.

Detect the contract type from these common types:
- NDA (Non-Disclosure Agreement)
- FOUNDERS (Founders Agreement / Co-Founder Agreement)
- SAFE (Simple Agreement for Future Equity)
- EMPLOYMENT (Employment Agreement)
- LEASE (Lease / Rental Agreement)
- SPA (Share Purchase Agreement)
- MSA (Master Service Agreement)
- SAAS (SaaS Agreement / Software License)
- DPA (Data Processing Agreement)
- CONSULTING (Consulting / Independent Contractor Agreement)
- OTHER (if none of the above match)

Detect the jurisdiction by looking for:
- CALIFORNIA: References to California law, CA Civil Code, CCPA, Silicon Valley companies, San Francisco courts
- ENGLAND_WALES: References to English law, UK Acts of Parliament, Companies Act 2006, London courts, "governed by the laws of England and Wales"
- SPAIN: References to Spanish law, Ley de Sociedades de Capital, Codigo Civil, tribunales de Madrid, Derecho espanol
- UNKNOWN: If no clear jurisdiction indicators are found

CONTRACT TEXT:
${truncated}

Provide your analysis as structured output.`;
}

export function buildClauseExtractionPrompt(
  text: string,
  classification: ClassificationResult,
  skillContext: string | null
): string {
  const skillSection = skillContext
    ? `\n\nEXPERT REFERENCE KNOWLEDGE (from LegalSkills repository):
${skillContext}

Use this reference knowledge to:
1. Match extracted clauses to known clause types where applicable
2. Guide your categorization of clauses
3. Identify the expected structure for this type of contract`
    : "";

  return `You are a legal contract analysis expert. Extract all individual clauses from the following contract.

CONTRACT CLASSIFICATION:
- Type: ${classification.contractTypeLabel} (${classification.contractType})
- Jurisdiction: ${classification.jurisdiction}
- Parties: ${classification.partyNames.join(", ")}
${skillSection}

For each clause, provide:
1. A descriptive title
2. The category (e.g., Term, Liability, IP, Confidentiality, Termination, Payment, Equity, Governance)
3. The original text verbatim from the contract
4. A plain language summary
5. Its legal significance
6. Whether it's biased toward one party (neutral, favors-party-a, favors-party-b)
7. If it matches a known clause from the reference knowledge, provide the skillClauseMatch ID

CONTRACT TEXT:
${text}

Extract ALL clauses, including preamble, recitals, and boilerplate sections.`;
}

export function buildIssueFlaggingPrompt(
  classification: ClassificationResult,
  clauseTitles: string[],
  expectedClauses: string[] | null,
  jurisdiction: string
): string {
  const expectedClausesSection = expectedClauses
    ? `\n\nEXPECTED CLAUSES for ${classification.contractTypeLabel}:
${expectedClauses.map((c) => `- ${c}`).join("\n")}

Check if any of these expected clauses are MISSING from the contract.`
    : "";

  const jurisdictionWarnings = getJurisdictionWarnings(jurisdiction);

  return `You are a legal contract review expert. Review the following contract analysis and flag potential issues.

CONTRACT:
- Type: ${classification.contractTypeLabel} (${classification.contractType})
- Jurisdiction: ${classification.jurisdiction}
- Parties: ${classification.partyNames.join(", ")}
- Summary: ${classification.summary}

EXTRACTED CLAUSES:
${clauseTitles.map((t, i) => `${i + 1}. ${t}`).join("\n")}
${expectedClausesSection}

JURISDICTION-SPECIFIC WARNINGS for ${jurisdiction}:
${jurisdictionWarnings}

Flag issues in these categories:
- MISSING_CLAUSE: Standard clauses that should be present but are not
- UNUSUAL_TERM: Terms that are unusual or potentially problematic
- JURISDICTION_CONCERN: Clauses that may conflict with the jurisdiction's laws
- AMBIGUITY: Vague or ambiguous language that could lead to disputes
- IMBALANCE: Clauses that heavily favor one party
- COMPLIANCE_RISK: Potential regulatory compliance issues

For each issue, assign severity:
- CRITICAL: Issues that could invalidate the contract or cause significant legal exposure
- WARNING: Issues that should be reviewed and potentially addressed
- INFO: Minor observations or suggestions for improvement`;
}

function getJurisdictionWarnings(jurisdiction: string): string {
  switch (jurisdiction) {
    case "CALIFORNIA":
      return `- Non-compete clauses are VOID under California Business & Professions Code Section 16600
- CCPA/CPRA compliance required for personal data handling
- At-will employment is the default; deviations should be explicit
- California Labor Code provides strong employee protections
- Forum selection clauses must be reasonable under CA law
- Liquidated damages must be reasonable; penalties are unenforceable`;

    case "ENGLAND_WALES":
      return `- Non-compete clauses must be reasonable in scope and duration to be enforceable
- Unfair Contract Terms Act 1977 applies to limitation/exclusion clauses
- GDPR/UK GDPR compliance required for personal data
- Good leaver/bad leaver provisions are common and enforceable
- "Entire agreement" clauses should include non-reliance language
- Contracts must comply with the Companies Act 2006 where applicable`;

    case "SPAIN":
      return `- Labor law (Estatuto de los Trabajadores) provides strong employee protections
- Non-compete clauses require compensation and are limited to 2 years
- Ley de Sociedades de Capital governs corporate agreements
- GDPR (RGPD) compliance required; AEPD is the supervisory authority
- Penalty clauses (clausulas penales) are enforceable but can be moderated by courts
- Consumer protection laws (Ley General para la Defensa de los Consumidores y Usuarios) may apply`;

    default:
      return `- No specific jurisdiction warnings available
- General best practices apply
- Consider which jurisdiction's laws would govern in case of dispute`;
  }
}
