import { FlowDiagram } from "../components/FlowDiagram";
import {
  FileSearch,
  Layers,
  AlertTriangle,
  BookOpen,
  Scale,
  Cpu,
  Zap,
  Key,
} from "lucide-react";

export default function AnalysisDocsPage() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section>
        <div className="flex items-center gap-2 mb-1">
          <span className="tag-accent">AI Analysis</span>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-3">
          AI Analysis Pipeline
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed max-w-2xl">
          Clausemaster uses a three-step AI pipeline powered by the Vercel AI
          SDK to analyze contracts. Choose between our free community model or
          bring your own API key for premium providers. Each step builds on the
          previous one to provide comprehensive results.
        </p>
      </section>

      {/* Pipeline Overview */}
      <section id="pipeline" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Pipeline Overview
        </h2>
        <div className="card-brutal">
          <FlowDiagram
            steps={[
              {
                label: "Classification",
                description: "Detect contract type & metadata",
              },
              {
                label: "Extraction",
                description: "Break down into clauses",
              },
              {
                label: "Issue Flagging",
                description: "Flag risks & concerns",
              },
            ]}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          All three steps run sequentially using{" "}
          <code className="px-1.5 py-0.5 rounded bg-card border border-border text-xs">
            generateObject
          </code>{" "}
          from the Vercel AI SDK, producing structured JSON output validated
          against typed schemas.
        </p>
      </section>

      {/* Step 1: Classification */}
      <section id="classification" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Step 1: Classification
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          The first step identifies what kind of contract this is and extracts
          key metadata.
        </p>

        <div className="card-brutal">
          <FileSearch className="w-6 h-6 text-primary mb-3" />
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Detected Fields
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                field: "Contract Type",
                desc: "e.g., NDA, Employment Agreement, SaaS Terms, Lease",
              },
              {
                field: "Jurisdiction",
                desc: "Governing law and jurisdiction identified from the text",
              },
              {
                field: "Parties",
                desc: "Names and roles of all parties to the agreement",
              },
              {
                field: "Effective Date",
                desc: "Start date or execution date if mentioned",
              },
            ].map((item) => (
              <div
                key={item.field}
                className="p-3 rounded-lg bg-background border border-border"
              >
                <p className="text-xs font-semibold text-foreground">
                  {item.field}
                </p>
                <p className="text-[11px] text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Step 2: Clause Extraction */}
      <section id="extraction" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Step 2: Clause Extraction
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          The contract is broken down into individual clauses, each analyzed for
          content, category, and bias.
        </p>

        <div className="card-brutal mb-6">
          <Layers className="w-6 h-6 text-primary mb-3" />
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Per-Clause Analysis
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                field: "Clause Type",
                desc: "Specific type (e.g., Termination, Indemnification, Non-Compete)",
              },
              {
                field: "Category",
                desc: "Broad category grouping related clause types",
              },
              {
                field: "Summary",
                desc: "One-line plain-language summary of the clause",
              },
              {
                field: "Full Text",
                desc: "The exact text extracted from the contract",
              },
              {
                field: "Bias Assessment",
                desc: "Neutral, Favors Party A, or Favors Party B",
              },
              {
                field: "Skill Match",
                desc: "Confidence score if matched to a known legal skill",
              },
            ].map((item) => (
              <div
                key={item.field}
                className="p-3 rounded-lg bg-background border border-border"
              >
                <p className="text-xs font-semibold text-foreground">
                  {item.field}
                </p>
                <p className="text-[11px] text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <h3 className="text-base font-semibold text-foreground mb-3">
          Bias Assessment
        </h3>
        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Neutral
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
            Favors Party A
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20">
            Favors Party B
          </span>
        </div>
      </section>

      {/* Step 3: Issue Flagging */}
      <section id="issue-flagging" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Step 3: Issue Flagging
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          The final step scans for potential problems, missing clauses, unusual
          terms, and jurisdiction-specific concerns.
        </p>

        <h3 className="text-base font-semibold text-foreground mb-3">
          Issue Types
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
          {[
            {
              type: "Missing Clause",
              desc: "A standard clause expected for this contract type is absent.",
              icon: AlertTriangle,
            },
            {
              type: "Unusual Term",
              desc: "A clause contains non-standard or potentially problematic language.",
              icon: AlertTriangle,
            },
            {
              type: "Jurisdiction Risk",
              desc: "Terms that may conflict with the identified governing jurisdiction.",
              icon: Scale,
            },
            {
              type: "Ambiguous Language",
              desc: "Vague wording that could lead to differing interpretations.",
              icon: AlertTriangle,
            },
            {
              type: "Compliance Gap",
              desc: "Potential regulatory or compliance issue detected.",
              icon: AlertTriangle,
            },
            {
              type: "Imbalanced Term",
              desc: "A clause significantly favors one party over the other.",
              icon: Scale,
            },
          ].map((item) => (
            <div key={item.type} className="card-brutal">
              <item.icon className="w-5 h-5 text-primary mb-2" />
              <p className="text-sm font-semibold text-foreground mb-1">
                {item.type}
              </p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>

        <h3 className="text-base font-semibold text-foreground mb-3">
          Severity Levels
        </h3>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <span className="text-xs font-medium text-red-400">High</span>
            <span className="text-[11px] text-muted-foreground">
              &mdash; Requires immediate attention
            </span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <div className="w-2 h-2 rounded-full bg-yellow-400" />
            <span className="text-xs font-medium text-yellow-400">Medium</span>
            <span className="text-[11px] text-muted-foreground">
              &mdash; Should be reviewed
            </span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-xs font-medium text-green-400">Low</span>
            <span className="text-[11px] text-muted-foreground">
              &mdash; Informational concern
            </span>
          </div>
        </div>
      </section>

      {/* Supported Contract Types */}
      <section id="contract-types" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Supported Contract Types
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          The AI can analyze a wide range of contract types. Common examples
          include:
        </p>

        <div className="flex flex-wrap gap-2">
          {[
            "NDA / Confidentiality",
            "Employment Agreement",
            "SaaS / Software License",
            "Lease / Rental",
            "Service Agreement",
            "Partnership Agreement",
            "Term Sheet",
            "Purchase Agreement",
            "Consulting Agreement",
            "Freelance / Contractor",
            "Loan Agreement",
            "Settlement Agreement",
          ].map((type) => (
            <span key={type} className="tag">
              {type}
            </span>
          ))}
        </div>
      </section>

      {/* AI Providers */}
      <section id="ai-providers" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          AI Providers
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Clausemaster supports multiple AI providers. Choose the option that
          best fits your needs and budget.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="card-brutal">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-green-500" />
              <h3 className="text-sm font-semibold text-foreground">
                Community (Free)
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Start analyzing contracts immediately with no API key required.
              Powered by an open-weights model hosted by the platform.
            </p>
            <ul className="space-y-1.5">
              {[
                "No API key or account needed",
                "Good for getting started and drafting skills",
                "All pipeline features available",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-xs text-muted-foreground"
                >
                  <span className="w-1 h-1 rounded-full bg-green-500 mt-1.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="card-brutal">
            <div className="flex items-center gap-2 mb-3">
              <Key className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">
                Bring Your Own Key
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Use your preferred AI provider for higher quality output or
              specific model requirements.
            </p>
            <ul className="space-y-1.5">
              {[
                "Anthropic (Claude)",
                "OpenAI (GPT)",
                "Groq (Llama)",
                "Mistral",
                "Together AI (Llama)",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-xs text-muted-foreground"
                >
                  <span className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="card-brutal flex items-start gap-3">
          <Cpu className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">
              How It Works
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your AI provider choice is stored per-account. You can switch
              providers at any time from Settings. All providers use the same
              analysis pipeline and produce the same structured output format
              &mdash; only the underlying model differs. API keys are encrypted
              at rest using AES-256-GCM.
            </p>
          </div>
        </div>
      </section>

      {/* LegalSkills Integration */}
      <section id="legalskills" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          LegalSkills Integration
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          The analysis pipeline references the LegalSkills knowledge base during
          clause extraction and issue flagging to improve accuracy.
        </p>

        <div className="card-brutal flex items-start gap-3">
          <BookOpen className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">
              How It Works
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The LegalSkills repository contains structured legal knowledge
              (clause patterns, boilerplate language, and best practices). During
              Steps 2 and 3, this knowledge is loaded as read-only reference
              context for the AI, improving clause identification accuracy and
              enabling skill match confidence scores.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
