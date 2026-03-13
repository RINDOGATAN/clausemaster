import type { ClassificationResult, ClauseExtractionResult } from "./schemas";

export function buildClassificationPrompt(text: string): string {
  // Use first ~8K tokens worth of text for classification
  const truncated = text.slice(0, 32000);

  return `You are a legal document analysis expert. Analyze the following document text and classify it.

Detect the document type from these common types:

CONTRACT TYPES:
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
- PRIVACY_POLICY (Privacy Policy)
- TERMS_OF_SERVICE (Terms of Service / Terms & Conditions)
- ACCEPTABLE_USE (Acceptable Use Policy)
- CODE_OF_CONDUCT (Code of Conduct)
- OTHER (if none of the above match)

ASSESSMENT TYPES:
- GDPR_ASSESSMENT (GDPR Compliance Assessment / Checklist)
- AI_GOVERNANCE (AI Governance Framework / Policy)
- DPIA_TEMPLATE (Data Protection Impact Assessment Template)
- VENDOR_AUDIT (Vendor/Third-Party Audit Framework)
- PRIVACY_IMPACT (Privacy Impact Assessment)
- COMPLIANCE_CHECKLIST (General Compliance Checklist)
- RISK_ASSESSMENT (Risk Assessment Framework)

DOCUMENT CATEGORY:
- "contract" — any agreement, policy, or terms document that governs a relationship or sets rules
- "assessment" — a compliance checklist, audit framework, impact assessment template, or scoring rubric designed to evaluate compliance or risk

PARTY MODE (for contracts only):
- "two-party" — agreements negotiated between two distinct parties (NDA, SPA, Employment, MSA, etc.)
- "solo" — unilateral documents drafted by one party (Privacy Policy, ToS, Acceptable Use, Code of Conduct)

DESTINATION ROUTING:
- "deal-room" — all contract types (both two-party and solo)
- "dpo-central" — privacy/data protection assessments (GDPR, DPIA, privacy impact, vendor audits for data processing)
- "ai-sentinel" — AI governance and AI-specific risk assessments

Detect the jurisdiction by looking for:
- CALIFORNIA: References to California law, CA Civil Code, CCPA, Silicon Valley companies, San Francisco courts
- ENGLAND_WALES: References to English law, UK Acts of Parliament, Companies Act 2006, London courts, "governed by the laws of England and Wales"
- SPAIN: References to Spanish law, Ley de Sociedades de Capital, Codigo Civil, tribunales de Madrid, Derecho espanol
- UNKNOWN: If no clear jurisdiction indicators are found

DOCUMENT TEXT:
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

export function buildOptionGenerationPrompt(
  contractText: string,
  classification: ClassificationResult,
  clauses: ClauseExtractionResult["clauses"]
): string {
  const clauseSummary = clauses.map((c, i) =>
    `${i + 1}. "${c.title}" (${c.category || "General"}) — ${c.summary}\n   Bias: ${c.biasAssessment}\n   Original: ${c.originalText.slice(0, 300)}...`
  ).join("\n\n");

  return `You are a legal negotiation expert specializing in two-party deal room software. Your task is to transform an analyzed contract into negotiation clauses with multiple options for a Dealroom platform.

CONTEXT:
- Contract Type: ${classification.contractTypeLabel} (${classification.contractType})
- Jurisdiction: ${classification.jurisdiction}
- Parties: ${classification.partyNames.join(" and ")}
- Summary: ${classification.summary}

EXTRACTED CLAUSES FROM THE CONTRACT:
${clauseSummary}

INSTRUCTIONS:
For each extracted clause, generate a negotiation clause with 3-5 options representing genuine negotiation positions along a spectrum from Party-A-favorable to Party-B-favorable.

For each clause:
1. Create a slug "id" (lowercase, hyphenated, e.g. "data-retention", "liability-cap")
2. Assign a clear category (e.g. Equity, Term, Liability, IP, Confidentiality, Payment, Governance, Termination)
3. Write a plainDescription explaining what the clause covers in plain language
4. Optionally provide legalContext with regulatory/legal background
5. Set isRequired to true for clauses essential to contract validity

For each option within a clause:
1. Create a descriptive id (e.g. "narrow", "standard", "broad", "aggressive", "balanced")
2. Provide a short code (e.g. "NARROW", "STANDARD", "BROAD")
3. Write a clear label (e.g. "Narrow Scope", "Standard Terms", "Broad Protection")
4. Write prosPartyA (2-4 advantages for Party A — "${classification.partyNames[0] || "Party A"}")
5. Write consPartyA (2-4 disadvantages for Party A)
6. Write prosPartyB (2-4 advantages for Party B — "${classification.partyNames[1] || "Party B"}")
7. Write consPartyB (2-4 disadvantages for Party B)
8. Write the FULL legal text as it would appear in the contract
9. Set biasPartyA: 1.0 = strongly favors Party A, 0.0 = neutral, -1.0 = strongly against Party A
10. Set biasPartyB: inverse of biasPartyA (biasPartyB ≈ -biasPartyA)

CRITICAL RULES:
- Options must represent GENUINE negotiation positions, not just word variations
- Always include at least one "balanced/standard" option near bias 0
- Bias scores must be realistic: most balanced options near 0, partisan options at ±0.3 to ±0.8, extreme positions at ±0.9 to ±1.0
- Legal text must be complete, precise, and professionally drafted
- Pros and cons must be substantive and reflect real legal/business tradeoffs
- Order options from most Party-A-favorable to most Party-B-favorable

ORIGINAL CONTRACT TEXT (for reference):
${contractText.slice(0, 16000)}`;
}

export function buildSoloOptionGenerationPrompt(
  contractText: string,
  classification: ClassificationResult,
  clauses: ClauseExtractionResult["clauses"]
): string {
  const clauseSummary = clauses.map((c, i) =>
    `${i + 1}. "${c.title}" (${c.category || "General"}) — ${c.summary}\n   Original: ${c.originalText.slice(0, 300)}...`
  ).join("\n\n");

  return `You are a legal document drafting expert. Your task is to transform an analyzed document into clause variants for a solo-party document builder platform.

CONTEXT:
- Document Type: ${classification.contractTypeLabel} (${classification.contractType})
- Jurisdiction: ${classification.jurisdiction}
- Summary: ${classification.summary}

This is a SOLO-PARTY document (e.g., a privacy policy, terms of service, acceptable use policy). There is no negotiation between two parties. Instead, the drafter selects from variant approaches for each clause.

EXTRACTED CLAUSES FROM THE DOCUMENT:
${clauseSummary}

INSTRUCTIONS:
For each extracted clause, generate 3-5 variant approaches along a spectrum from minimal/basic to comprehensive/protective.

For each clause:
1. Create a slug "id" (lowercase, hyphenated, e.g. "data-collection", "cookie-policy")
2. Assign a clear category (e.g. Data Collection, User Rights, Liability, IP, Termination, Dispute Resolution)
3. Write a plainDescription explaining what the clause covers in plain language
4. Optionally provide legalContext with regulatory/legal background
5. Set isRequired to true for clauses essential to document validity

For each option within a clause:
1. Create a descriptive id (e.g. "minimal", "standard", "comprehensive", "aggressive")
2. Provide a short code (e.g. "MIN", "STD", "COMP")
3. Write a clear label (e.g. "Minimal Approach", "Standard Terms", "Comprehensive Protection")
4. Write advantages (2-4 benefits of this approach for the drafter)
5. Write disadvantages (2-4 tradeoffs or risks of this approach)
6. Write the FULL legal text as it would appear in the document

CRITICAL RULES:
- Options represent GENUINE variant approaches, not just wording differences
- Label options descriptively (Minimal, Standard, Comprehensive, or similar)
- Advantages and disadvantages should reflect real legal/business tradeoffs from the drafter's perspective
- Legal text must be complete, precise, and professionally drafted
- Order options from most minimal to most comprehensive

ORIGINAL DOCUMENT TEXT (for reference):
${contractText.slice(0, 16000)}`;
}

export function buildBoilerplateGenerationPrompt(
  classification: ClassificationResult,
  clauseTitles: string[],
  options?: { soloParty?: boolean }
): string {
  const isSolo = options?.soloParty;

  const placeholderSection = isSolo
    ? `PLACEHOLDER VARIABLES (use these exactly):
- {effectiveDate} — date the document takes effect
- {partyName} — full legal name of the publishing party
- {partyAddress} — registered address of the publishing party
- {partySignatureBlock} — signature block for the party`
    : `PLACEHOLDER VARIABLES (use these exactly):
- {effectiveDate} — date the contract takes effect
- {partyAName} — full legal name of Party A
- {partyBName} — full legal name of Party B
- {partyAAddress} — registered address of Party A
- {partyBAddress} — registered address of Party B
- {partyASignatureBlock} — signature block for Party A
- {partyBSignatureBlock} — signature block for Party B`;

  const signatureReq = isSolo
    ? `8. signatureBlock: Template for signature using the placeholder variable {partySignatureBlock}
9. partyLabels: Label for the party (e.g. partyA: "Company", partyB should be empty string for solo-party documents)`
    : `8. signatureBlock: Template for signatures using the placeholder variables
9. partyLabels: Appropriate labels for the parties (e.g. "Company"/"Investor", "Employer"/"Employee", "Controller"/"Processor")`;

  const docType = isSolo ? "document" : "contract";

  return `You are a legal document architect. Generate the boilerplate framework for a ${docType} template that will be used in a ${isSolo ? "document builder" : "Dealroom negotiation"} platform.

${isSolo ? "DOCUMENT" : "CONTRACT"} DETAILS:
- Type: ${classification.contractTypeLabel} (${classification.contractType})
- Jurisdiction: ${classification.jurisdiction}
${isSolo ? `- Party: ${classification.partyNames[0] || "the publishing party"}` : `- Parties: ${classification.partyNames.join(" and ")}`}

${isSolo ? "CONFIGURABLE" : "NEGOTIABLE"} CLAUSES (these will be inserted separately — do NOT include them in the boilerplate):
${clauseTitles.map((t, i) => `${i + 1}. ${t}`).join("\n")}

INSTRUCTIONS:
Generate the non-negotiable framework of the ${docType}. This includes the preamble, background/recitals, definitions, standard (non-negotiable) clauses, general provisions, and signature block.

${placeholderSection}

REQUIREMENTS:
1. contractTitle: The ${docType} name in ALL CAPS
2. preamble: Opening paragraph identifying the ${isSolo ? "party" : "parties"} and the date, using placeholder variables
3. background: ${isSolo ? "Introduction section establishing the purpose of this document" : "WHEREAS/recitals section establishing why the parties are entering the agreement"}
4. definitions: Key defined terms used throughout the ${docType} (5-15 terms)
5. standardClauses: Non-negotiable clauses (e.g. "Entire Agreement", "Severability") — 3-6 clauses
6. generalProvisions: General/boilerplate provisions (e.g. "Notices", "Amendments", "Waiver"${isSolo ? "" : ', "Assignment"'}) — 3-8 provisions
7. jurisdictionProvisions: If the ${docType} references a specific jurisdiction (${classification.jurisdiction}), provide jurisdiction-specific provisions. Use keys like "CALIFORNIA", "ENGLAND_WALES", or "SPAIN".
${signatureReq}

CRITICAL RULES:
- Do NOT include any of the ${isSolo ? "configurable" : "negotiable"} clauses listed above
- Use professional legal language appropriate for the jurisdiction
- Definitions should only include terms that appear in the boilerplate sections
- All provisions should be self-contained and properly cross-referenced`;
}

export function buildCriteriaExtractionPrompt(
  text: string,
  classification: ClassificationResult
): string {
  return `You are a compliance and risk assessment expert. Parse the following document into a structured assessment framework with categories and criteria.

DOCUMENT CLASSIFICATION:
- Type: ${classification.contractTypeLabel} (${classification.contractType})
- Jurisdiction: ${classification.jurisdiction}
- Summary: ${classification.summary}

INSTRUCTIONS:
1. Identify the assessment type (e.g. GDPR Compliance, AI Governance, DPIA, Vendor Audit, Privacy Impact Assessment)
2. Choose the appropriate scoring method:
   - "checklist" — binary pass/fail criteria
   - "weighted" — criteria scored with different weights by category
   - "maturity-model" — criteria scored on a maturity scale (e.g. 1-5 levels)
3. Extract structured categories and criteria from the document
4. For each category, assign a weight (0-1) reflecting its importance (all weights should sum to ~1)
5. For each criterion:
   - Identify the risk level if non-compliant (low/medium/high/critical)
   - Extract regulatory references where present (e.g. "GDPR Art. 6", "AI Act Art. 9")
   - Order criteria logically within their category

DOCUMENT TEXT:
${text.slice(0, 32000)}

Provide your analysis as structured output.`;
}

export function buildGuidanceGenerationPrompt(
  classification: ClassificationResult,
  criteria: { assessmentType: string; categories: Array<{ title: string; criteria: Array<{ id: string; title: string; description: string; riskLevel: string }> }> }
): string {
  const criteriaList = criteria.categories.flatMap((cat) =>
    cat.criteria.map((c) => `- [${cat.title}] ${c.id}: ${c.title} — ${c.description} (risk: ${c.riskLevel})`)
  ).join("\n");

  return `You are a compliance advisor. Generate practical assessment guidance for each criterion in the following framework.

ASSESSMENT TYPE: ${criteria.assessmentType}
DOCUMENT TYPE: ${classification.contractTypeLabel} (${classification.contractType})
JURISDICTION: ${classification.jurisdiction}

CRITERIA TO GENERATE GUIDANCE FOR:
${criteriaList}

FOR EACH CRITERION, provide:
1. guidance: What an assessor should look for and check (practical steps)
2. remediation: What to do if non-compliant (actionable fix steps)
3. evidenceRequired: What documentation proves compliance (optional but recommended)
4. scoringOptions: 3-5 scoring options from lowest to highest compliance, each with:
   - id: slug (e.g. "not-implemented", "partial", "mostly-implemented", "fully-implemented")
   - label: human-readable label
   - score: numeric score (0-100)
   - description: what this level means

CRITICAL RULES:
- Guidance must be practical and actionable, not generic
- Remediation steps should be specific and implementable
- Scoring options should cover the full range from non-compliant to fully compliant
- Use jurisdiction-specific references where applicable`;
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
