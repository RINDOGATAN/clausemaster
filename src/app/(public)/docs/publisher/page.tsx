import { FlowDiagram } from "../components/FlowDiagram";
import { WorkflowStep } from "../components/WorkflowStep";
import {
  KeyRound,
  FileText,
  Sparkles,
  Send,
  CheckCircle,
  XCircle,
  User,
  ExternalLink,
  Cloud,
  ShoppingBag,
} from "lucide-react";

export default function PublisherDocsPage() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section>
        <div className="flex items-center gap-2 mb-1">
          <span className="tag-accent">Lawyer / Publisher</span>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-3">
          For Lawyers
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed max-w-2xl">
          Analyze contracts, generate legal skills for your own todo.law stack
          and the LegalQuants community, and provide expert reviews to startups.
        </p>
      </section>

      {/* Onboarding */}
      <section id="onboarding" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Onboarding
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Publisher accounts require an invite code provided by an admin. During
          sign-up, you&apos;ll complete a profile setup.
        </p>

        <div className="card-brutal">
          <WorkflowStep
            number={1}
            title="Receive Invite Code"
            actor="Admin"
            description="An internal admin generates an invite code and shares it with you."
          />
          <WorkflowStep
            number={2}
            title="Sign In & Enter Code"
            actor="Lawyer"
            description="Sign in with your email or Google account, then enter the invite code during onboarding."
          />
          <WorkflowStep
            number={3}
            title="Complete Profile"
            actor="Lawyer"
            description="Fill in your firm name, bio, specialties, and website to set up your publisher profile."
            details={[
              "Firm name and professional bio",
              "Areas of specialization (e.g., corporate, IP, employment)",
              "Website URL for your profile listing",
            ]}
          />
          <WorkflowStep
            number={4}
            title="Choose AI Provider"
            actor="Lawyer"
            description="Start with the free community model or bring your own API key from Anthropic, OpenAI, Groq, Mistral, or Together."
            details={[
              "Community model (free): no API key needed, analyze contracts immediately",
              "Bring your own key: choose your preferred provider for premium models",
              "Switch providers anytime from Settings",
            ]}
            isLast
          />
        </div>
      </section>

      {/* Document Analysis */}
      <section id="analysis" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Document Analysis
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Like startups, you can upload contracts and get AI analysis. The same
          pipeline runs for all users: classification, clause extraction, and
          issue flagging.
        </p>
        <div className="card-brutal">
          <FlowDiagram
            steps={[
              { label: "Upload" },
              { label: "Extract" },
              { label: "Classify" },
              { label: "Analyze" },
              { label: "Complete" },
            ]}
          />
        </div>
      </section>

      {/* Skill Generation */}
      <section id="skill-generation" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Skill Generation
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          After analyzing a document, you can generate a &quot;legal
          skill&quot;: a structured artifact that captures what the analysis
          found. Contracts become contract skills with clause options and
          boilerplate. Compliance documents (DPIA questionnaires, vendor
          audits) become assessment skills with scored criteria and guidance.
        </p>

        <div className="card-brutal mb-6">
          <FlowDiagram
            steps={[
              { label: "Analyze", description: "Run AI analysis" },
              { label: "Generate", description: "Create skill draft" },
              { label: "Review", description: "Edit & refine" },
              { label: "Submit", description: "Send for approval" },
              { label: "Publish", description: "Export to destinations" },
            ]}
          />
        </div>

        <h3 className="text-base font-semibold text-foreground mb-3">
          Skill Draft Editor
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Drafts stop in review so you can edit them before submitting.
          Contract drafts have Clauses, Boilerplate, and Metadata tabs.
          Assessment drafts have Criteria, Guidance, and Metadata tabs.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card-brutal">
            <FileText className="w-5 h-5 text-primary mb-2" />
            <h4 className="text-sm font-semibold text-foreground mb-1">
              Clauses / Criteria
            </h4>
            <p className="text-xs text-muted-foreground">
              Clause patterns with types, summaries, and bias indicators for
              contracts; scored criteria for assessments.
            </p>
          </div>
          <div className="card-brutal">
            <Sparkles className="w-5 h-5 text-primary mb-2" />
            <h4 className="text-sm font-semibold text-foreground mb-1">
              Boilerplate / Guidance
            </h4>
            <p className="text-xs text-muted-foreground">
              Recommended clause wording for contracts; reviewer guidance for
              assessments.
            </p>
          </div>
          <div className="card-brutal">
            <KeyRound className="w-5 h-5 text-primary mb-2" />
            <h4 className="text-sm font-semibold text-foreground mb-1">
              Metadata
            </h4>
            <p className="text-xs text-muted-foreground">
              Contract type, jurisdiction, applicable law, and categorization
              tags.
            </p>
          </div>
        </div>

        <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">Evaluation cases:</strong>{" "}
            generated automatically as the final step and included in the
            export. There is no separate tab for them. They are AI-drafted, so
            have a lawyer review them before relying on them.
          </p>
        </div>
      </section>

      {/* Review Queue */}
      <section id="submission" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Submitting for Review
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Once you&apos;re satisfied with a skill draft, submit it from review
          status. It enters a queue where an internal reviewer approves or
          rejects it.
        </p>

        <div className="card-brutal space-y-4">
          <div className="flex items-start gap-3">
            <Send className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">Submit</p>
              <p className="text-xs text-muted-foreground">
                Click Submit on your skill draft. The status changes to
                pending.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">Approved</p>
              <p className="text-xs text-muted-foreground">
                An internal reviewer approves your skill and it is published.
                It also becomes available in the knowledge base for AI
                analysis.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">Rejected</p>
              <p className="text-xs text-muted-foreground">
                If rejected, you&apos;ll receive notes explaining what to
                improve. You can edit and resubmit.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Dual-Format: Your Stack and LegalQuants */}
      <section id="aas-dual-format" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Your Stack and the LegalQuants Community
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Skills you create in Clausemaster become{" "}
          <strong className="text-foreground">Agentic Attorney Skills (AAS)</strong>:
          dual-format modules that work in both your own todo.law
          deployments and the{" "}
          <a
            href="https://todo.law/skills"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1"
          >
            LegalQuants community
            <ExternalLink className="w-3 h-3" />
          </a>
          . Clausemaster is a free tool, not a marketplace. There is no revenue
          share and nothing to sell. You use it to get more from your own stack
          and to contribute to LegalQuants.
        </p>

        {/* Two reasons card */}
        <div className="card-brutal mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Cloud className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              Two Reasons to Build
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
              <p className="text-sm font-semibold text-primary mb-1">
                Get more from your stack
              </p>
              <p className="text-xs text-muted-foreground">
                Extend your self-hosted todo.law deployments with your own
                clause libraries and templates. Add your standards to Dealroom
                so it drafts the way you do. Your skills, your stack.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-background border border-border">
              <p className="text-sm font-semibold text-foreground mb-1">
                Contribute to LegalQuants
              </p>
              <p className="text-xs text-muted-foreground">
                Publish open skills to the LegalQuants (LQ.AI) community so your
                work runs across the ecosystem. Every skill is dual-format for
                both todo.law and LQ.
              </p>
            </div>
          </div>
        </div>

        {/* Pipeline flow */}
        <div className="card-brutal mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            From Clausemaster to Running Skill
          </h3>
          <FlowDiagram
            steps={[
              { label: "Clausemaster", description: "Analyze & generate" },
              { label: "Review", description: "Edit & refine" },
              { label: "Publish", description: "Install or contribute" },
              { label: "todo.law", description: "Your own stack" },
              { label: "LegalQuants", description: "The community" },
            ]}
          />
        </div>

        {/* Where skills install */}
        <h3 className="text-base font-semibold text-foreground mb-3">
          Where Skills Install
        </h3>
        <p className="text-sm text-muted-foreground">
          Contract skills install into Dealroom as signed packages. Assessment
          skills install into DPO Central. AI Sentinel skills can be authored,
          but the AI Sentinel installer is still in development, so they cannot
          be installed yet. The same skill folder also loads in
          LegalQuants-community runtimes such as LQ.AI and in other agent-skill
          hosts.
        </p>
      </section>

      {/* Where Your Skills Are Used */}
      <section id="where-used" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Where Your Skills Are Used
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          AAS power multiple TODO.LAW products. Law firms, startups, and developers
          install skills to enhance their legal workflows.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="card-brutal">
            <ShoppingBag className="w-5 h-5 text-primary mb-2" />
            <h4 className="text-sm font-semibold text-foreground mb-1">
              Dealroom
            </h4>
            <p className="text-xs text-muted-foreground">
              AI-powered deal management. Skills provide contract analysis,
              risk scoring, and clause generation.
            </p>
          </div>
          <div className="card-brutal">
            <FileText className="w-5 h-5 text-primary mb-2" />
            <h4 className="text-sm font-semibold text-foreground mb-1">
              DPO Central
            </h4>
            <p className="text-xs text-muted-foreground">
              Privacy compliance platform. Skills automate DPIAs, vendor audits,
              and regulatory assessments.
            </p>
          </div>
        </div>

        <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">Who uses them?</strong>{" "}
            Law firms seeking automation, startups needing legal tooling, and
            developers building legal-tech integrations.
          </p>
        </div>
      </section>

      {/* Client Reviews */}
      <section id="client-reviews" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Reviewing Startup Contracts
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Startups can request expert reviews of their AI-analyzed contracts.
          As a lawyer, you can claim and complete these reviews.
        </p>

        <div className="card-brutal">
          <WorkflowStep
            number={1}
            title="Browse Available Reviews"
            actor="Lawyer"
            description="Visit the Reviews dashboard to see pending review requests from startups."
          />
          <WorkflowStep
            number={2}
            title="Claim a Review"
            actor="Lawyer"
            description="Select a review request and claim it. The status changes to 'In Review' and other lawyers can no longer claim it."
          />
          <WorkflowStep
            number={3}
            title="Review the Analysis"
            actor="Lawyer"
            description="Examine the AI analysis alongside the original contract text. Identify areas that need expert input."
          />
          <WorkflowStep
            number={4}
            title="Write Review Notes"
            actor="Lawyer"
            description="Provide your expert observations, corrections, and recommendations in the review notes."
          />
          <WorkflowStep
            number={5}
            title="Complete Review"
            actor="Lawyer"
            description="Submit your notes. The startup is notified and can view your feedback on their document page."
            isLast
          />
        </div>
      </section>

      {/* Publisher Profile */}
      <section id="profile" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Publisher Profile
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Manage your professional profile from the Settings page. This
          information is visible to startups and admins.
        </p>

        <div className="card-brutal">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              Profile Fields
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { field: "Firm Name", desc: "Your law firm or practice name" },
              {
                field: "Bio",
                desc: "Professional summary (displayed on your profile)",
              },
              {
                field: "Specialties",
                desc: "Areas of law you practice (e.g., IP, Employment)",
              },
              { field: "Website", desc: "Link to your firm or portfolio" },
            ].map((item) => (
              <div
                key={item.field}
                className="p-3 rounded-lg bg-background border border-border"
              >
                <p className="text-xs font-semibold text-foreground">
                  {item.field}
                </p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
