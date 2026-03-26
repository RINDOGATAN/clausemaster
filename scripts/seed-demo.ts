/**
 * Seed demo data for Clausemaster video recording.
 *
 * Creates:
 *   - Demo publisher user with PUBLISHER role
 *   - Publisher profile with firm details
 *   - Publisher invite code (PUBLISHER-BETA-2026)
 *   - 3 documents with analyses, clauses, issues, and skill drafts
 *
 * Usage:
 *   npx tsx scripts/seed-demo.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_USER_ID = "demo-publisher";
const DEMO_EMAIL = "demo@clausemaster.example";

async function main() {
  console.log("Seeding Clausemaster demo data...\n");

  // 1. Create demo publisher user
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {
      name: "María García López",
      role: "PUBLISHER",
      onboardedAt: new Date("2026-01-15"),
    },
    create: {
      id: DEMO_USER_ID,
      email: DEMO_EMAIL,
      name: "María García López",
      role: "PUBLISHER",
      onboardedAt: new Date("2026-01-15"),
      emailVerified: new Date("2026-01-15"),
    },
  });
  console.log(`  ✓ User: ${user.email} (${user.role})`);

  // 2. Publisher profile
  await prisma.publisherProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      firmName: "García López & Asociados",
      bio: "Boutique law firm specializing in cross-border commercial contracts and technology licensing. 15+ years advising startups and scale-ups across the EU.",
      specialties: [
        "Commercial Contracts",
        "Technology Licensing",
        "Cross-border Transactions",
        "EU Regulatory Compliance",
      ],
      website: "https://garcialopez.legal",
      stripeConnectComplete: true,
      stripeConnectAccountId: "acct_demo_test",
    },
  });
  console.log("  ✓ Publisher profile");

  // 3. Publisher invite code
  await prisma.publisherInvite.upsert({
    where: { code: "PUBLISHER-BETA-2026" },
    update: {},
    create: {
      code: "PUBLISHER-BETA-2026",
      label: "Beta publisher program",
      maxUses: 100,
      usedCount: 12,
      active: true,
    },
  });
  console.log("  ✓ Invite code: PUBLISHER-BETA-2026");

  // 4. Document 1: NDA (completed analysis + approved skill)
  const doc1 = await prisma.document.upsert({
    where: { id: "demo-doc-nda" },
    update: {},
    create: {
      id: "demo-doc-nda",
      userId: user.id,
      fileName: "Mutual NDA - Acme Corp.pdf",
      fileType: "PDF",
      fileSize: 245000,
      status: "COMPLETED",
    },
  });

  const analysis1 = await prisma.analysis.upsert({
    where: { documentId: doc1.id },
    update: {},
    create: {
      documentId: doc1.id,
      contractType: "nda",
      contractTypeLabel: "Non-Disclosure Agreement (Mutual)",
      jurisdiction: "CALIFORNIA",
      jurisdictionNotes: "Governed by the laws of the State of California",
      summary:
        "A mutual non-disclosure agreement between Acme Corp and Beta Technologies for the purpose of evaluating a potential technology partnership. The agreement includes standard confidentiality obligations, a 3-year term, and carve-outs for independently developed information.",
      partyNames: ["Acme Corp", "Beta Technologies"],
      effectiveDate: "2026-01-20",
      documentCategory: "commercial",
      partyMode: "TWO_PARTY",
      suggestedDestination: "DEAL_ROOM",
      aiProvider: "anthropic",
      aiModel: "claude-sonnet-4-20250514",
      processingTimeMs: 12400,
    },
  });

  // Clauses for NDA
  const ndaClauses = [
    {
      order: 1,
      title: "Definition of Confidential Information",
      category: "definitions",
      originalText:
        '"Confidential Information" means any non-public information disclosed by either party to the other party, whether orally, in writing, or by inspection, including but not limited to business plans, financial data, customer lists, technical specifications, and trade secrets.',
      summary:
        "Broad definition covering all non-public information shared between parties, including business plans, financials, customer data, and trade secrets.",
      legalSignificance:
        "This is a standard broad definition. Consider whether specific categories should be excluded or whether a marking requirement should be added.",
      biasAssessment: "NEUTRAL" as const,
    },
    {
      order: 2,
      title: "Obligations of Receiving Party",
      category: "obligations",
      originalText:
        "The Receiving Party shall: (a) hold Confidential Information in strict confidence; (b) not disclose it to any third party without prior written consent; (c) use it solely for the Purpose; (d) protect it with no less than reasonable care.",
      summary:
        "Standard confidentiality obligations requiring strict confidence, no third-party disclosure without consent, purpose-limited use, and reasonable care.",
      legalSignificance:
        'The "reasonable care" standard is common but may favor the receiving party. Consider requiring the same level of care used for the party\'s own confidential information.',
      biasAssessment: "FAVORS_PARTY_B" as const,
    },
    {
      order: 3,
      title: "Exclusions from Confidential Information",
      category: "exclusions",
      originalText:
        "Confidential Information shall not include information that: (a) is or becomes publicly available through no fault of the Receiving Party; (b) was known to the Receiving Party prior to disclosure; (c) is independently developed without use of Confidential Information; (d) is disclosed by a third party without restriction.",
      summary:
        "Standard carve-outs allowing exclusion of public information, prior knowledge, independent development, and third-party disclosures.",
      legalSignificance:
        "These are well-established exclusions. The independent development exclusion is important for technology companies.",
      biasAssessment: "NEUTRAL" as const,
    },
    {
      order: 4,
      title: "Term and Termination",
      category: "term",
      originalText:
        "This Agreement shall remain in effect for three (3) years from the Effective Date. The obligations of confidentiality shall survive termination for a period of two (2) additional years.",
      summary:
        "3-year agreement term with confidentiality obligations surviving for 2 years after termination (5 years total).",
      legalSignificance:
        "A 5-year total confidentiality period is reasonable for most commercial NDAs. Trade secrets should be protected indefinitely.",
      biasAssessment: "NEUTRAL" as const,
    },
    {
      order: 5,
      title: "Governing Law and Dispute Resolution",
      category: "governing-law",
      originalText:
        "This Agreement shall be governed by and construed in accordance with the laws of the State of California, without regard to its conflict of law provisions. Any dispute shall be resolved by binding arbitration in San Francisco.",
      summary:
        "California law governs. Disputes resolved through binding arbitration in San Francisco.",
      legalSignificance:
        "Binding arbitration may limit discovery rights and appeal options. Consider whether litigation should remain an option for injunctive relief.",
      biasAssessment: "FAVORS_PARTY_A" as const,
    },
  ];

  for (const clause of ndaClauses) {
    await prisma.analyzedClause.upsert({
      where: { id: `demo-clause-nda-${clause.order}` },
      update: {},
      create: {
        id: `demo-clause-nda-${clause.order}`,
        analysisId: analysis1.id,
        ...clause,
      },
    });
  }

  // Issues for NDA
  await prisma.issue.upsert({
    where: { id: "demo-issue-nda-1" },
    update: {},
    create: {
      id: "demo-issue-nda-1",
      analysisId: analysis1.id,
      clauseId: "demo-clause-nda-2",
      type: "IMBALANCE",
      severity: "WARNING",
      title: "Reasonable care standard may be insufficient",
      description:
        'The "reasonable care" standard for protecting confidential information is vague and may not provide adequate protection. A higher standard such as "the same degree of care that the Receiving Party uses to protect its own most sensitive confidential information" is recommended.',
      recommendation:
        "Replace 'reasonable care' with 'at least the same degree of care used to protect its own confidential information, but not less than reasonable care'.",
    },
  });

  await prisma.issue.upsert({
    where: { id: "demo-issue-nda-2" },
    update: {},
    create: {
      id: "demo-issue-nda-2",
      analysisId: analysis1.id,
      type: "MISSING_CLAUSE",
      severity: "CRITICAL",
      title: "No return/destruction clause",
      description:
        "The agreement does not include provisions for the return or destruction of confidential information upon termination. This is a significant gap that leaves confidential materials in the possession of the receiving party indefinitely.",
      recommendation:
        "Add a clause requiring the return or destruction of all confidential information within 30 days of termination, with certification of destruction.",
    },
  });

  await prisma.issue.upsert({
    where: { id: "demo-issue-nda-3" },
    update: {},
    create: {
      id: "demo-issue-nda-3",
      analysisId: analysis1.id,
      clauseId: "demo-clause-nda-5",
      type: "JURISDICTION_CONCERN",
      severity: "INFO",
      title: "Binding arbitration limits remedies",
      description:
        "Mandatory binding arbitration may limit the disclosing party's ability to seek emergency injunctive relief in court for unauthorized disclosure of confidential information.",
      recommendation:
        "Add a carve-out allowing either party to seek injunctive or equitable relief in a court of competent jurisdiction.",
    },
  });

  // Skill draft for NDA (approved)
  await prisma.skillDraft.upsert({
    where: { analysisId: analysis1.id },
    update: {},
    create: {
      analysisId: analysis1.id,
      status: "APPROVED",
      skillType: "CONTRACT",
      partyMode: "TWO_PARTY",
      destination: "DEAL_ROOM",
      skillId: "nda-mutual-california",
      contractType: "nda",
      displayName: "Mutual NDA (California)",
      clausesJson: {
        clauses: ndaClauses.map((c) => ({
          id: c.title.toLowerCase().replace(/\s+/g, "-"),
          title: c.title,
          options: [
            { label: "Balanced", bias: 0, text: c.originalText },
            { label: "Discloser-favoring", bias: 0.6, text: "(Strengthened version)" },
            { label: "Receiver-favoring", bias: -0.4, text: "(Relaxed version)" },
          ],
        })),
      },
      metadataJson: {
        jurisdictions: ["US-CA"],
        languages: ["en"],
        version: "1.0.0",
      },
      submittedAt: new Date("2026-02-10"),
      aiProvider: "anthropic",
      aiModel: "claude-sonnet-4-20250514",
      processingTimeMs: 28500,
    },
  });
  console.log("  ✓ Document 1: Mutual NDA (analyzed + approved skill)");

  // 5. Document 2: Consulting Agreement (completed, skill submitted)
  const doc2 = await prisma.document.upsert({
    where: { id: "demo-doc-consulting" },
    update: {},
    create: {
      id: "demo-doc-consulting",
      userId: user.id,
      fileName: "Consulting Services Agreement.pdf",
      fileType: "PDF",
      fileSize: 389000,
      status: "COMPLETED",
    },
  });

  const analysis2 = await prisma.analysis.upsert({
    where: { documentId: doc2.id },
    update: {},
    create: {
      documentId: doc2.id,
      contractType: "consulting",
      contractTypeLabel: "Consulting Services Agreement",
      jurisdiction: "ENGLAND_WALES",
      summary:
        "A consulting services agreement between a technology company and an independent consultant for product development advisory services. Includes IP assignment, non-compete, and milestone-based payment schedule.",
      partyNames: ["TechStartup Ltd", "Dr. Sarah Chen"],
      documentCategory: "commercial",
      partyMode: "TWO_PARTY",
      suggestedDestination: "DEAL_ROOM",
      aiProvider: "anthropic",
      aiModel: "claude-sonnet-4-20250514",
      processingTimeMs: 15200,
    },
  });

  await prisma.skillDraft.upsert({
    where: { analysisId: analysis2.id },
    update: {},
    create: {
      analysisId: analysis2.id,
      status: "SUBMITTED",
      skillType: "CONTRACT",
      partyMode: "TWO_PARTY",
      destination: "DEAL_ROOM",
      skillId: "consulting-services-uk",
      contractType: "consulting",
      displayName: "Consulting Services (England & Wales)",
      submittedAt: new Date("2026-03-01"),
      aiProvider: "anthropic",
      aiModel: "claude-sonnet-4-20250514",
    },
  });
  console.log("  ✓ Document 2: Consulting Agreement (submitted skill)");

  // 6. Document 3: License Agreement (completed, skill generating)
  const doc3 = await prisma.document.upsert({
    where: { id: "demo-doc-license" },
    update: {},
    create: {
      id: "demo-doc-license",
      userId: user.id,
      fileName: "Software License Agreement - SaaS.pdf",
      fileType: "PDF",
      fileSize: 512000,
      status: "COMPLETED",
    },
  });

  const analysis3 = await prisma.analysis.upsert({
    where: { documentId: doc3.id },
    update: {},
    create: {
      documentId: doc3.id,
      contractType: "license",
      contractTypeLabel: "Software License Agreement (SaaS)",
      jurisdiction: "SPAIN",
      summary:
        "A SaaS software license agreement with subscription pricing, data processing terms, SLA commitments, and GDPR-compliant data handling provisions. Multi-year term with automatic renewal.",
      partyNames: ["CloudSoft S.L.", "Enterprise Customer"],
      documentCategory: "technology",
      partyMode: "TWO_PARTY",
      suggestedDestination: "DEAL_ROOM",
      aiProvider: "anthropic",
      aiModel: "claude-sonnet-4-20250514",
      processingTimeMs: 18700,
    },
  });

  await prisma.skillDraft.upsert({
    where: { analysisId: analysis3.id },
    update: {},
    create: {
      analysisId: analysis3.id,
      status: "REVIEW",
      skillType: "CONTRACT",
      partyMode: "TWO_PARTY",
      destination: "DEAL_ROOM",
      skillId: "saas-license-spain",
      contractType: "license",
      displayName: "SaaS License (Spain)",
      aiProvider: "anthropic",
      aiModel: "claude-sonnet-4-20250514",
    },
  });
  console.log("  ✓ Document 3: SaaS License (skill in review)");

  console.log("\nDemo data seeded successfully!");
  console.log(`\nSign in with: ${DEMO_EMAIL}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
