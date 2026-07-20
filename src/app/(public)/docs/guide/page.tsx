import Link from "next/link";
import {
  Upload,
  Brain,
  PenLine,
  CheckCircle2,
  Package,
  Globe,
  Scale,
} from "lucide-react";
import { brand } from "@/config/brand";

export const metadata = {
  title: "End-to-End Guide | Clausemaster Docs",
  description:
    "From uploading a document to running your skill in todo.law apps and LegalQuants runtimes.",
};

const steps = [
  {
    icon: Upload,
    title: "1. Upload a document",
    body: "Start from your best precedent, not a blank template. Contracts (NDA, MSA, term sheets, DPAs) become contract skills. Compliance documents (DPIA questionnaires, vendor audits, checklists) become assessment skills. PDF, DOCX, and TXT up to 10MB.",
  },
  {
    icon: Brain,
    title: "2. Review the analysis",
    body: "The pipeline classifies the document, extracts every clause with a plain-language summary and bias assessment, and flags issues by severity. This is also where the document category is decided: contract or assessment. Check it before generating a skill, because it determines the skill type and destination.",
  },
  {
    icon: PenLine,
    title: "3. Generate the skill draft",
    body: "One click starts generation. Contract drafts get a clause library where each clause carries 3 to 5 negotiation options with pros, cons, and full legal text, plus contract boilerplate. Assessment drafts get scored criteria organized in categories, with per-criterion guidance and remediation. Both finish with evaluation cases grounded in the skill's own content.",
  },
  {
    icon: CheckCircle2,
    title: "4. Edit in review",
    body: "Every draft stops in a review state before anything is published. Edit clauses, boilerplate, criteria, guidance, and metadata until the skill drafts the way you do. The generated evaluation cases are AI-drafted: have a lawyer confirm any legal claims in them before anyone relies on the skill.",
  },
  {
    icon: Package,
    title: "5. Publish",
    body: "Publishing exports the skill in both formats at once and runs a conformance check first, so a malformed skill fails at export with a clear message instead of failing at install time. The result is a folder with the engine data, the agent-facing SKILL.md, a README, parameters, evaluation cases, and the license you chose.",
  },
];

export default function GuidePage() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section>
        <h1 className="text-3xl font-bold text-foreground mb-3">
          End-to-End Guide
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed max-w-2xl">
          The full journey: from a document you trust to a skill that runs in
          your todo.law apps and in LegalQuants-community runtimes. Fifteen
          minutes the first time, less after that.
        </p>
      </section>

      {/* Authoring steps */}
      <section id="authoring" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Authoring: document to published skill
        </h2>
        <div className="space-y-4">
          {steps.map((step) => (
            <div key={step.title} className="card-brutal flex items-start gap-4">
              <div className="w-9 h-9 rounded-lg bg-primary/15 border border-primary/30 text-primary flex items-center justify-center shrink-0">
                <step.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">
                  {step.title}
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* What a published skill contains */}
      <section id="skill-anatomy" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          What a published skill contains
        </h2>
        <div className="card-brutal space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            One publish produces a single folder that serves two worlds. Hosts
            read the parts they understand and ignore the rest.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-semibold text-foreground mb-2">
                Engine data (todo.law suite)
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>
                  <code className="text-xs">clauses.json</code> and{" "}
                  <code className="text-xs">boilerplate.json</code> for contract
                  skills
                </li>
                <li>
                  <code className="text-xs">template.json</code>,{" "}
                  <code className="text-xs">assessment.json</code>, and{" "}
                  <code className="text-xs">guidance.json</code> for assessment
                  skills
                </li>
                <li>
                  <code className="text-xs">manifest.json</code> and{" "}
                  <code className="text-xs">metadata.json</code>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground mb-2">
                Agent skill (any skills-capable runtime)
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>
                  <code className="text-xs">SKILL.md</code> with YAML
                  frontmatter and declared inputs
                </li>
                <li>
                  <code className="text-xs">README.md</code> and{" "}
                  <code className="text-xs">LICENSE</code>
                </li>
                <li>
                  <code className="text-xs">parameters.json</code> and{" "}
                  <code className="text-xs">evals/evals.json</code>
                </li>
              </ul>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The evaluation file carries three kinds of cases: a positive case
            naming the clauses or criteria the output must contain, a currency
            case probing the legal position most likely to go stale, and a
            gating case the skill must refuse or warn on. They are written from
            the skill&apos;s own content so they can be checked mechanically,
            and they are AI-drafted, so review them before relying on them.
          </p>
        </div>
      </section>

      {/* Running in todo.law */}
      <section id="todolaw" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Running your skill in todo.law apps
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card-brutal">
            <div className="flex items-center gap-2 mb-2">
              <Scale className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Dealroom</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Contract skills install as signed packages. Your clause options
              become the negotiation surface: each party picks positions, the
              engine assembles the contract from your legal text.
            </p>
          </div>
          <div className="card-brutal">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">
                DPO Central
              </p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Assessment skills install as scored templates. Your criteria,
              risk levels, and guidance drive the assessment wizard and its
              scoring.
            </p>
          </div>
          <div className="card-brutal">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">
                AI Sentinel
              </p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              AI governance assessments are supported at authoring time. The
              installer on the AI Sentinel side is in development, so these
              skills cannot be installed yet.
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed mt-4">
          Installation is verified: packages are signed, integrity-checked, and
          validated against the installer&apos;s schema before anything is
          activated.
        </p>
      </section>

      {/* Running in LegalQuants */}
      <section id="legalquants" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Running your skill in LegalQuants runtimes and agent hosts
        </h2>
        <div className="card-brutal space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            The same published folder is a standard agent skill. Any
            LegalQuants-community runtime loads it as data: the runtime reads{" "}
            <code className="text-xs">SKILL.md</code>, surfaces the declared
            inputs as a form, and assembles the skill text into the model
            prompt. No conversion step, no separate export.
          </p>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>
              <span className="font-semibold text-foreground">LQ.AI:</span>{" "}
              place the skill folder in the runtime&apos;s skills directory, or
              contribute it to the community skills repository. The community
              gate requires the README, license, and evaluation cases your
              skill already ships with.
            </li>
            <li>
              <span className="font-semibold text-foreground">
                Claude and other agent-skill hosts:
              </span>{" "}
              upload the folder (or a zip of it) wherever agent skills are
              accepted. Hosts that do not understand the engine JSON files
              simply ignore them.
            </li>
            <li>
              <span className="font-semibold text-foreground">
                Legal skill hubs:
              </span>{" "}
              community hubs that accept agent skills can list your skill
              as-is. Check each hub&apos;s naming and review requirements
              before submitting.
            </li>
          </ul>
        </div>
      </section>

      {/* vs conversational builders */}
      <section id="compare" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          When to use {brand.name}, and when to use a conversational builder
        </h2>
        <div className="card-brutal space-y-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Conversational builders such as Anthropic&apos;s skill-creator
            write a skill from what you articulate in a chat. That fits
            knowledge that lives in your head: escalation rules, review
            discipline, negotiation judgment. {brand.name} starts from the
            other end: the knowledge already in your documents. A clause
            library refined over fifty deals cannot be dictated in a chat, but
            it can be uploaded.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The two combine well. Generate the skill from your document here,
            then refine the <code className="text-xs">SKILL.md</code> prose
            conversationally in any agent that supports skills. The structured
            engine data stays intact either way.
          </p>
        </div>
      </section>

      {/* Next steps */}
      <section id="next" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Go deeper
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/docs/analysis" className="group">
            <div className="card-brutal h-full transition-all group-hover:border-primary/40">
              <Brain className="w-5 h-5 text-primary mb-2" />
              <p className="text-sm font-semibold text-foreground">
                AI Analysis
              </p>
              <p className="text-xs text-muted-foreground">
                How the three-step pipeline reads your document.
              </p>
            </div>
          </Link>
          <Link href="/docs/publisher" className="group">
            <div className="card-brutal h-full transition-all group-hover:border-primary/40">
              <Scale className="w-5 h-5 text-primary mb-2" />
              <p className="text-sm font-semibold text-foreground">
                For Lawyers
              </p>
              <p className="text-xs text-muted-foreground">
                Publisher onboarding, drafting, and the review queue.
              </p>
            </div>
          </Link>
          <Link href="/docs/client" className="group">
            <div className="card-brutal h-full transition-all group-hover:border-primary/40">
              <Globe className="w-5 h-5 text-primary mb-2" />
              <p className="text-sm font-semibold text-foreground">
                For Startups
              </p>
              <p className="text-xs text-muted-foreground">
                Analysis, reports, and lawyer reviews without authoring.
              </p>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
