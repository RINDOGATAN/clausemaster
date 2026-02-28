import { FlowDiagram } from "../components/FlowDiagram";
import { WorkflowStep } from "../components/WorkflowStep";
import { Price } from "../components/Price";
import {
  KeyRound,
  FileText,
  Sparkles,
  Send,
  CheckCircle,
  XCircle,
  User,
  DollarSign,
  ExternalLink,
  Cloud,
  Server,
  Cpu,
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
          Analyze contracts, generate legal skills for the marketplace, and
          provide expert reviews to clients.
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
          Like clients, you can upload contracts and get AI analysis. The same
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
          After analyzing a contract, you can generate a &quot;legal skill&quot;
          &mdash; a structured knowledge artifact that captures clause patterns,
          boilerplate language, and metadata from the analysis.
        </p>

        <div className="card-brutal mb-6">
          <FlowDiagram
            steps={[
              { label: "Analyze", description: "Run AI analysis" },
              { label: "Generate", description: "Create skill draft" },
              { label: "Review", description: "Edit & refine" },
              { label: "Submit", description: "Send for approval" },
              { label: "Published", description: "Live in marketplace" },
            ]}
          />
        </div>

        <h3 className="text-base font-semibold text-foreground mb-3">
          Skill Draft Editor
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          The skill draft editor organizes generated content into tabs for easy
          review and editing.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card-brutal">
            <FileText className="w-5 h-5 text-primary mb-2" />
            <h4 className="text-sm font-semibold text-foreground mb-1">
              Clauses
            </h4>
            <p className="text-xs text-muted-foreground">
              Extracted clause patterns with types, summaries, and bias
              indicators.
            </p>
          </div>
          <div className="card-brutal">
            <Sparkles className="w-5 h-5 text-primary mb-2" />
            <h4 className="text-sm font-semibold text-foreground mb-1">
              Boilerplate
            </h4>
            <p className="text-xs text-muted-foreground">
              Standard language templates and recommended clause wording.
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
      </section>

      {/* Marketplace Submission */}
      <section id="submission" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Marketplace Submission
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Once you&apos;re satisfied with a skill draft, submit it to the
          marketplace for admin review.
        </p>

        <div className="card-brutal space-y-4">
          <div className="flex items-start gap-3">
            <Send className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">Submit</p>
              <p className="text-xs text-muted-foreground">
                Click &quot;Submit to Marketplace&quot; on your skill draft. The
                status changes to pending.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">Approved</p>
              <p className="text-xs text-muted-foreground">
                An admin reviews and approves your skill. It becomes available in
                the knowledge base for AI analysis.
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

      {/* Earn from the AAS Marketplace */}
      <section id="aas-marketplace" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Earn from the AAS Marketplace
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Skills you create in Clausemaster become{" "}
          <strong className="text-foreground">Agentic Attorney Skills (AAS)</strong>{" "}
          &mdash; AI-powered legal modules listed on the{" "}
          <a
            href="https://todo.law/skills"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1"
          >
            TODO.LAW marketplace
            <ExternalLink className="w-3 h-3" />
          </a>
          . When lawyers or firms purchase your skills, you earn revenue.
        </p>

        {/* Revenue card */}
        <div className="card-brutal mb-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              Revenue Split
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/30 text-center">
              <p className="text-2xl font-bold text-primary">70%</p>
              <p className="text-xs text-muted-foreground mt-1">You earn</p>
            </div>
            <div className="p-4 rounded-lg bg-background border border-border text-center">
              <p className="text-2xl font-bold text-foreground">30%</p>
              <p className="text-xs text-muted-foreground mt-1">
                Platform (hosting, distribution &amp; support)
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-background border border-border">
              <p className="text-xs text-muted-foreground">Self-hosted / downloadable</p>
              <p className="text-sm font-semibold text-foreground">
                <Price amount={60} period="/year" />
              </p>
            </div>
            <div className="p-3 rounded-lg bg-background border border-border">
              <p className="text-xs text-muted-foreground">Cloud add-on</p>
              <p className="text-sm font-semibold text-foreground">
                <Price amount={9} period="/month" />
              </p>
            </div>
          </div>
        </div>

        {/* Pipeline flow */}
        <div className="card-brutal mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            From Clausemaster to Revenue
          </h3>
          <FlowDiagram
            steps={[
              { label: "Clausemaster", description: "Analyze & generate" },
              { label: "Submit", description: "Send for review" },
              { label: "Approved", description: "Admin approves" },
              { label: "Listed", description: "Live on todo.law" },
              { label: "Earn", description: "70% revenue" },
            ]}
          />
        </div>

        {/* Three deployment targets */}
        <h3 className="text-base font-semibold text-foreground mb-3">
          Deployment Targets
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Your published skills can be consumed in three ways by buyers.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card-brutal">
            <Cloud className="w-5 h-5 text-primary mb-2" />
            <h4 className="text-sm font-semibold text-foreground mb-1">
              TODO.LAW Hosted
            </h4>
            <p className="text-xs text-muted-foreground">
              Instant activation on the TODO.LAW cloud. Zero setup for buyers.
            </p>
          </div>
          <div className="card-brutal">
            <Server className="w-5 h-5 text-primary mb-2" />
            <h4 className="text-sm font-semibold text-foreground mb-1">
              Self-Hosted Cloud
            </h4>
            <p className="text-xs text-muted-foreground">
              Downloadable packages deployed to the buyer&apos;s own infrastructure.
            </p>
          </div>
          <div className="card-brutal">
            <Cpu className="w-5 h-5 text-primary mb-2" />
            <h4 className="text-sm font-semibold text-foreground mb-1">
              Portable Hardware
            </h4>
            <p className="text-xs text-muted-foreground">
              Air-gapped devices running open-weight models for maximum confidentiality.
            </p>
          </div>
        </div>
      </section>

      {/* Where Your Skills Are Used */}
      <section id="where-used" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Where Your Skills Are Used
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          AAS power multiple TODO.LAW products. Law firms, startups, and developers
          purchase skills to enhance their legal workflows.
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
            <strong className="text-foreground">Who buys?</strong>{" "}
            Law firms seeking automation, startups needing legal tooling, and
            developers building legal-tech integrations.
          </p>
        </div>
      </section>

      {/* Client Reviews */}
      <section id="client-reviews" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Reviewing Client Contracts
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Clients can request expert reviews of their AI-analyzed contracts.
          As a lawyer, you can claim and complete these reviews.
        </p>

        <div className="card-brutal">
          <WorkflowStep
            number={1}
            title="Browse Available Reviews"
            actor="Lawyer"
            description="Visit the Reviews dashboard to see pending review requests from clients."
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
            description="Submit your notes. The client is notified and can view your feedback on their document page."
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
          information is visible to clients and admins.
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
